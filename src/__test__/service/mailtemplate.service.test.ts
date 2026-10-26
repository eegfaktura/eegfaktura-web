import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MailTemplateError, MailTemplateService} from "../../service/mailtemplate.service";
import {AuthService} from "../../service/auth.service";

const authService = {getToken: async () => "token"} as unknown as AuthService;
const fetchMock = vi.fn();

const reply = (body: any, status = 200) =>
  ({ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob(["x"])});
const summary = (key: string, extra: Record<string, any> = {}) =>
  ({key, name: key, description: "", customized: false, updatedAt: null, updatedBy: null, defaultChanged: false, ...extra});
const url = (call: number) => fetchMock.mock.calls[call][0] as string
const init = (call: number) => fetchMock.mock.calls[call][1] as RequestInit

describe("MailTemplateService", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  describe("fetchList", () => {
    const route = (backend: any, billing: any) => fetchMock.mockImplementation(async (u: string) =>
      u.includes("/api/mailtemplates") ? billing() : backend())

    it("merges the backend and billing mails into one list, backend first, with their source", async () => {
      route(() => reply([summary("consent-request"), summary("zp-active"), summary("zp-inactive", {customized: true})]),
        () => reply([summary("billing-document", {defaultChanged: true})]))
      const r = await new MailTemplateService(authService).fetchList("RC100100")

      expect(r.failed).toEqual([])
      expect(r.items.map(i => `${i.source}:${i.key}`))
        .toEqual(["backend:consent-request", "backend:zp-active", "backend:zp-inactive", "billing:billing-document"])
      expect(r.items[2].customized).toBe(true)
      expect(r.items[3].defaultChanged).toBe(true)
      expect(fetchMock.mock.calls.map(c => c[0]).some((u: string) => u.endsWith("/eeg/mailtemplates"))).toBe(true)
      expect(fetchMock.mock.calls.map(c => c[0]).some((u: string) => u.endsWith("/api/mailtemplates"))).toBe(true)
      fetchMock.mock.calls.forEach(c => expect(c[1].headers).toMatchObject({Authorization: "Bearer token", tenant: "RC100100"}))
    })

    it("keeps the mails of one service when the other one fails", async () => {
      route(() => reply([summary("consent-request")]), () => reply({message: "down"}, 503))
      const r = await new MailTemplateService(authService).fetchList("RC100100")
      expect(r.items.map(i => i.key)).toEqual(["consent-request"])
      expect(r.failed).toEqual(["billing"])
    })

    it("reports both services when both fail", async () => {
      route(() => Promise.reject(new TypeError("network")), () => reply({}, 403))
      const r = await new MailTemplateService(authService).fetchList("RC100100")
      expect(r.items).toEqual([])
      expect(r.failed).toEqual(["backend", "billing"])
    })
  })

  describe("saveTemplate", () => {
    const draft = {subject: "Betreff", bodyHtml: "<p>x</p>"}

    it("sends subject, bodyHtml and version with PUT to the service of the mail", async () => {
      fetchMock.mockResolvedValueOnce(reply({key: "billing-document", version: 4}))
      const r = await new MailTemplateService(authService).saveTemplate("billing", "RC100100", "billing-document", draft, 3)
      expect(r.version).toBe(4)
      expect(url(0)).toMatch(/\/api\/mailtemplates\/billing-document$/)
      expect(init(0).method).toBe("PUT")
      expect(JSON.parse(init(0).body as string)).toEqual({subject: "Betreff", bodyHtml: "<p>x</p>", version: 3, attachmentFileId: null})
    })

    it("rejects a 409 as conflict with the current version", async () => {
      fetchMock.mockResolvedValueOnce(reply({message: "version conflict", currentVersion: 7}, 409))
      const err = await new MailTemplateService(authService)
        .saveTemplate("backend", "RC100100", "zp-active", {...draft, attachmentFileId: "pdf-1"}, 3).catch(e => e)
      expect(err).toBeInstanceOf(MailTemplateError)
      expect(err.isConflict).toBe(true)
      expect(err.currentVersion).toBe(7)
      expect(err.message).toBe("Die Fassung wurde inzwischen geändert")
    })

    it("rejects a 400 with the messages of the service", async () => {
      fetchMock.mockResolvedValueOnce(reply({errors: [{field: "bodyHtml", message: "Unbekannter Platzhalter: foo"}, {field: "subject", message: "Betreff zu lang"}]}, 400))
      const err = await new MailTemplateService(authService)
        .saveTemplate("backend", "RC100100", "zp-active", draft, 0).catch(e => e)
      expect(err.isConflict).toBe(false)
      expect(err.status).toBe(400)
      expect(err.message).toBe("Unbekannter Platzhalter: foo\nBetreff zu lang")
      expect(err.fieldErrors).toHaveLength(2)
    })
  })

  it("sends the preview with the chosen PDF, null without one", async () => {
    fetchMock.mockResolvedValue(reply({subject: "S", html: "<html></html>"}))
    const svc = new MailTemplateService(authService)
    await svc.preview("billing", "RC100100", "billing-document", {subject: "S", bodyHtml: "<p>x</p>", attachmentFileId: "pdf-1"})
    await svc.preview("billing", "RC100100", "billing-document", {subject: "S", bodyHtml: "<p>x</p>"})
    expect(url(0)).toMatch(/\/api\/mailtemplates\/billing-document\/preview$/)
    expect(JSON.parse(init(0).body as string)).toEqual({subject: "S", bodyHtml: "<p>x</p>", attachmentFileId: "pdf-1"})
    expect(JSON.parse(init(1).body as string)).toEqual({subject: "S", bodyHtml: "<p>x</p>", attachmentFileId: null})
  })

  it("preview and test mail send only the draft (no useDefault since the volume templates are gone)", async () => {
    fetchMock.mockResolvedValue(reply({subject: "S", html: "", sentTo: "a@b.at"}))
    const svc = new MailTemplateService(authService)
    await svc.preview("backend", "RC100100", "consent-request", {subject: "S", bodyHtml: "<p>x</p>"})
    await svc.sendTest("backend", "RC100100", "consent-request", "me", {subject: "S", bodyHtml: "<p>x</p>"})
    expect(JSON.parse(init(0).body as string)).not.toHaveProperty("useDefault")
    expect(JSON.parse(init(1).body as string)).not.toHaveProperty("useDefault")
  })

  it("uploads a file as multipart with field kind", async () => {
    fetchMock.mockResolvedValueOnce(reply({id: "f1", kind: "image", filename: "logo.png", mimeType: "image/png", size: 1}, 201))
    const f = await new MailTemplateService(authService)
      .uploadFile("backend", "RC100100", "consent-request", new Blob(["x"], {type: "image/png"}), "logo.png", "image")
    expect(f.id).toBe("f1")
    expect(url(0)).toMatch(/\/eeg\/mailtemplates\/consent-request\/files$/)
    const body = init(0).body as FormData
    expect(body.get("kind")).toBe("image")
    expect((body.get("file") as File).name).toBe("logo.png")
  })

  it("sends the test mail with recipient and returns the address", async () => {
    fetchMock.mockResolvedValueOnce(reply({sentTo: "eeg@example.at"}))
    const to = await new MailTemplateService(authService)
      .sendTest("backend", "RC100100", "zp-active", "eeg", {subject: "S", bodyHtml: "<p>x</p>", attachmentFileId: "pdf-1"})
    expect(to).toBe("eeg@example.at")
    expect(url(0)).toMatch(/\/eeg\/mailtemplates\/zp-active\/test$/)
    expect(JSON.parse(init(0).body as string)).toEqual({recipient: "eeg", subject: "S", bodyHtml: "<p>x</p>", attachmentFileId: "pdf-1"})
  })
})
