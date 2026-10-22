import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import "../../../util/I18n";
import MailTemplateEditor, {createBlobUrlCache, insertAtCursor} from "../../../components/mailtemplate/MailTemplateEditor.component";
import {Api} from "../../../service";
import {MailTemplateError} from "../../../service/mailtemplate.service";
import {MailTemplate} from "../../../models/mailtemplate.model";

const template = (version: number, subject: string): MailTemplate => ({
  key: "zp-active", name: "Zählpunkt aktiv", description: "wird verschickt, wenn …",
  subject, bodyHtml: '<p>Hallo <span data-ph="member.firstName">Vorname</span></p>',
  customized: version > 0, version, defaultVersion: 1, defaultChanged: false,
  defaultSubject: "Dein Zählpunkt ist aktiv", defaultBodyHtml: "<p>Standard</p>",
  updatedAt: "2026-10-22T10:00:00Z", updatedBy: "admin",
  placeholders: [{key: "member.firstName", label: "Vorname", block: false}],
  files: [],
  limits: {maxImages: 10, maxImageBytes: 1048576, maxAttachments: 1, maxAttachmentBytes: 3145728, maxTotalBytes: 6291456},
})

describe("MailTemplateEditor", () => {
  it("shows the conflict on 409 and reloads the current version", async () => {
    const fetchTemplate = vi.fn()
      .mockResolvedValueOnce(template(3, "Alt"))
      .mockResolvedValueOnce(template(4, "Von jemand anderem"))
    const saveTemplate = vi.fn().mockRejectedValue(new MailTemplateError("conflict", 409, [], 4))
    Api.mailTemplateService = {fetchTemplate, saveTemplate, fetchFile: vi.fn()} as unknown as typeof Api.mailTemplateService

    render(<MailTemplateEditor tenant="RC100100" source="backend" templateKey="zp-active" eegEmail="eeg@example.at"
                               onClose={vi.fn()} onChanged={vi.fn()}/>)
    await waitFor(() => expect(screen.getByText("Zählpunkt aktiv")).toBeTruthy())

    fireEvent.click(screen.getByText("Speichern"))
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("wurde inzwischen geändert"))
    expect(saveTemplate).toHaveBeenCalledWith("backend", "RC100100", "zp-active",
      {subject: "Alt", bodyHtml: '<p>Hallo <span data-ph="member.firstName">Vorname</span></p>'}, 3, null)
    expect((screen.getByText("Speichern").closest("ion-button") as any).disabled).toBe(true)

    fireEvent.click(screen.getByText("Neu laden"))
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
    expect(fetchTemplate).toHaveBeenCalledTimes(2)
    expect((screen.getByText("Speichern").closest("ion-button") as any).disabled).toBe(false)
  })

  it("disables the test mail to the community without an EEG address and hides attachments without limit", async () => {
    const tpl = {...template(0, "S"), limits: {...template(0, "S").limits, maxAttachments: 0}}
    Api.mailTemplateService = {fetchTemplate: vi.fn().mockResolvedValue(tpl), fetchFile: vi.fn()} as unknown as typeof Api.mailTemplateService

    render(<MailTemplateEditor tenant="RC100100" source="billing" templateKey="billing-document"
                               onClose={vi.fn()} onChanged={vi.fn()}/>)
    await waitFor(() => expect(screen.getByText("Standard")).toBeTruthy())
    expect((screen.getByText("Testmail an die Gemeinschaft").closest("ion-button") as any).disabled).toBe(true)
    expect((screen.getByText("Testmail an mich").closest("ion-button") as any).disabled).toBe(false)
    expect(screen.queryByText("PDF anhängen")).toBeNull()
    expect(screen.getByText("Das Rechnungs-PDF wird immer angehängt.")).toBeTruthy()
  })
})

describe("MailTemplateEditor files", () => {
  const IMG_SAVED = "11111111-1111-4111-8111-111111111111"
  const IMG_DRAFT = "22222222-2222-4222-8222-222222222222"
  const PDF_SAVED = "33333333-3333-4333-8333-333333333333"
  const withFiles = (): MailTemplate => ({
    ...template(3, "S"),
    bodyHtml: `<p>Logo <img src="mailfile:${IMG_SAVED}" alt="logo.png"></p>`,
    attachmentFileId: PDF_SAVED,
    files: [
      {id: IMG_SAVED, kind: "image", filename: "logo.png", mimeType: "image/png", size: 2048, committed: true},
      {id: IMG_DRAFT, kind: "image", filename: "neu.png", mimeType: "image/png", size: 2048, committed: false},
      {id: PDF_SAVED, kind: "attachment", filename: "info.pdf", mimeType: "application/pdf", size: 4096, committed: true},
    ],
  })
  const setup = (deleteFile = vi.fn().mockResolvedValue(undefined)) => {
    const saveTemplate = vi.fn().mockResolvedValue(withFiles())
    Api.mailTemplateService = {
      fetchTemplate: vi.fn().mockResolvedValue(withFiles()), saveTemplate, deleteFile,
      fetchFile: vi.fn().mockResolvedValue(new Blob(["x"])),
    } as unknown as typeof Api.mailTemplateService
    render(<MailTemplateEditor tenant="RC100100" source="backend" templateKey="zp-active"
                               onClose={vi.fn()} onChanged={vi.fn()}/>)
    return {saveTemplate, deleteFile}
  }

  it("lists images and the PDF with draft/saved state and sends attachmentFileId on save", async () => {
    const {saveTemplate} = setup()
    await waitFor(() => expect(screen.getByText(/logo\.png/)).toBeTruthy())
    expect(screen.getByText(/logo\.png/).textContent).toContain("gespeichert")
    expect(screen.getByText(/neu\.png/).textContent).toContain("Entwurf")
    expect(screen.getByText(/neu\.png/).textContent).toContain("nicht im Text")
    fireEvent.click(screen.getByText("Speichern"))
    await waitFor(() => expect(saveTemplate).toHaveBeenCalled())
    expect(saveTemplate.mock.calls[0][5]).toBe(PDF_SAVED)
  })

  it("deletes a draft on the service, drops saved files with the next save", async () => {
    const {saveTemplate, deleteFile} = setup()
    await waitFor(() => expect(screen.getByText(/neu\.png/)).toBeTruthy())
    fireEvent.click(screen.getByLabelText("neu.png entfernen"))
    await waitFor(() => expect(screen.queryByText(/neu\.png/)).toBeNull())
    expect(deleteFile).toHaveBeenCalledWith("backend", "RC100100", "zp-active", IMG_DRAFT)

    fireEvent.click(screen.getByLabelText("logo.png entfernen"))
    fireEvent.click(screen.getByLabelText("info.pdf entfernen"))
    await waitFor(() => expect(screen.queryByText(/info\.pdf/)).toBeNull())
    expect(deleteFile).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText("Speichern"))
    await waitFor(() => expect(saveTemplate).toHaveBeenCalled())
    expect(saveTemplate.mock.calls[0][3].bodyHtml).toBe("<p>Logo </p>")
    expect(saveTemplate.mock.calls[0][5]).toBeNull()
  })

  it("keeps a draft the service reports as in use (409) until the next save", async () => {
    setup(vi.fn().mockRejectedValue(new MailTemplateError("in use", 409)))
    await waitFor(() => expect(screen.getByText(/neu\.png/)).toBeTruthy())
    fireEvent.click(screen.getByLabelText("neu.png entfernen"))
    await waitFor(() => expect(screen.queryByText(/neu\.png/)).toBeNull())
  })
})

describe("MailTemplateEditor placeholder pickers", () => {
  it("inserts the same placeholder twice into the body", async () => {
    const saveTemplate = vi.fn().mockResolvedValue(template(4, "S"))
    Api.mailTemplateService = {
      fetchTemplate: vi.fn().mockResolvedValue({...template(3, "S"), bodyHtml: "<p>Hallo</p>"}), saveTemplate, fetchFile: vi.fn(),
    } as unknown as typeof Api.mailTemplateService
    render(<MailTemplateEditor tenant="RC100100" source="backend" templateKey="zp-active"
                               onClose={vi.fn()} onChanged={vi.fn()}/>)
    await waitFor(() => expect(screen.getByText("Zählpunkt aktiv")).toBeTruthy())
    const choose = () => fireEvent(screen.getByTestId("body-placeholder"),
      new CustomEvent("ionChange", {detail: {value: "member.firstName"}}))
    const first = screen.getByTestId("body-placeholder")
    choose()
    // the picker is a new element (value reset), so choosing the same entry fires again
    expect(screen.getByTestId("body-placeholder")).not.toBe(first)
    choose()
    fireEvent.click(screen.getByText("Speichern"))
    await waitFor(() => expect(saveTemplate).toHaveBeenCalled())
    expect(saveTemplate.mock.calls[0][3].bodyHtml.match(/data-ph="member\.firstName"/g)).toHaveLength(2)
  })
})

describe("MailTemplateEditor reload/reset errors", () => {
  it("shows a failed reload above the loaded version", async () => {
    const fetchTemplate = vi.fn()
      .mockResolvedValueOnce(template(3, "Alt"))
      .mockRejectedValueOnce(new MailTemplateError("Keine Berechtigung", 403))
    const saveTemplate = vi.fn().mockRejectedValue(new MailTemplateError("conflict", 409, [], 4))
    Api.mailTemplateService = {fetchTemplate, saveTemplate, fetchFile: vi.fn()} as unknown as typeof Api.mailTemplateService
    render(<MailTemplateEditor tenant="RC100100" source="backend" templateKey="zp-active"
                               onClose={vi.fn()} onChanged={vi.fn()}/>)
    await waitFor(() => expect(screen.getByText("Zählpunkt aktiv")).toBeTruthy())
    fireEvent.click(screen.getByText("Speichern"))
    await waitFor(() => expect(screen.getByText("Neu laden")).toBeTruthy())
    fireEvent.click(screen.getByText("Neu laden"))
    await waitFor(() => expect(screen.getByText(/Die Mail konnte nicht geladen werden \(Keine Berechtigung\)/)).toBeTruthy())
    expect(screen.getByText("Zählpunkt aktiv")).toBeTruthy()
  })
})

describe("createBlobUrlCache", () => {
  it("caches fetched images but not failed fetches", async () => {
    const createObjectURL = vi.fn(() => "blob:1")
    vi.stubGlobal("URL", Object.assign(Object.create(URL), {createObjectURL, revokeObjectURL: vi.fn()}))
    try {
      const fetchBlob = vi.fn()
        .mockRejectedValueOnce(new Error("down"))
        .mockResolvedValue(new Blob(["x"]))
      const cache = createBlobUrlCache(fetchBlob)
      await expect(cache.resolve("a")).rejects.toThrow("down")
      await expect(cache.resolve("a")).resolves.toBe("blob:1")
      await expect(cache.resolve("a")).resolves.toBe("blob:1")
      expect(fetchBlob).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe("insertAtCursor (subject placeholders)", () => {
  it("inserts {key} at the cursor, replaces a selection, appends without cursor", () => {
    expect(insertAtCursor("Rechnung  - EEG", "{document.period}", 9, 9))
      .toEqual({value: "Rechnung {document.period} - EEG", cursor: 26})
    expect(insertAtCursor("Hallo XX!", "{member.firstName}", 6, 8))
      .toEqual({value: "Hallo {member.firstName}!", cursor: 24})
    expect(insertAtCursor("Betreff ", "{eeg.name}")).toEqual({value: "Betreff {eeg.name}", cursor: 18})
  })
})
