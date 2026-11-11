import {describe, expect, it, vi} from "vitest";
import {fireEvent, render as rtlRender, screen, waitFor} from "@testing-library/react";
import {ReactElement} from "react";
import {MemoryRouter} from "react-router";
import "../../../util/I18n";
import MailTemplateEditor from "../../../components/mailtemplate/MailTemplateEditor.component";
import {linkLimitReached} from "../../../components/mailtemplate/mailTemplate.util";
import {Api} from "../../../service";
import {MailTemplateError} from "../../../service/mailtemplate.service";
import {MailTemplate, MailTemplateLimits} from "../../../models/mailtemplate.model";

const render = (ui: ReactElement) => rtlRender(ui, {wrapper: MemoryRouter})

const LIMITS: MailTemplateLimits = {
  maxImages: 3, maxImageBytes: 1048576, maxAttachments: 0, maxAttachmentBytes: 3145728, maxTotalBytes: 6291456,
  maxLinks: 3, maxLinkDomains: 2,
}
const RULES = "Links: höchstens 3, zu höchstens 2 Domains; keine Kurz-Links, keine IP-Adressen"

const template = (limits: MailTemplateLimits): MailTemplate => ({
  key: "zp-active", name: "Zählpunkt aktiv", description: "wird verschickt, wenn …",
  subject: "S", bodyHtml: "<p>Hallo</p>", customized: true, version: 3, defaultVersion: 1, defaultChanged: false,
  defaultSubject: "Standard", defaultBodyHtml: "<p>Standard</p>", updatedAt: "2026-10-22T10:00:00Z", updatedBy: "admin",
  placeholders: [], files: [], limits,
})

const open = async (limits: MailTemplateLimits, saveTemplate = vi.fn(), tpl = template(limits)) => {
  Api.mailTemplateService = {
    fetchTemplate: vi.fn().mockResolvedValue(tpl), fetchFile: vi.fn(), saveTemplate,
  } as unknown as typeof Api.mailTemplateService
  render(<MailTemplateEditor tenant="RC100100" source="backend" templateKey="zp-active" eegEmail="eeg@example.at"
                             onClose={vi.fn()} onChanged={vi.fn()}/>)
  await waitFor(() => expect(screen.getByText(/Bilder: 0 von höchstens/)).toBeTruthy())
}

describe("MailTemplateEditor link rules", () => {
  it("shows the link rules when the service sends the numbers", async () => {
    await open(LIMITS)
    expect(screen.getByText(RULES)).toBeTruthy()
  })

  it("shows no link rules for an older service without the numbers", async () => {
    const {maxLinks: _l, maxLinkDomains: _d, ...older} = LIMITS
    await open({...older, maxAttachments: 1})
    expect(screen.queryByText(/^Links:/)).toBeNull()
    // with an attachment allowed the PDF section is there
    expect(screen.getByText("PDF anhängen")).toBeTruthy()
  })

  it("hides the PDF section of a member mail at maxAttachments 0", async () => {
    await open(LIMITS)
    expect(screen.queryByText("PDF anhängen")).toBeNull()
    expect(screen.queryByText("PDF-Anhang")).toBeNull()
    expect(screen.queryByText(/^PDF-Anhang:/)).toBeNull()
  })

  it("does not send a PDF stored before at maxAttachments 0, so the save is not refused", async () => {
    const saveTemplate = vi.fn().mockImplementation(async () => template(LIMITS))
    await open(LIMITS, saveTemplate, {...template(LIMITS), attachmentFileId: "pdf-1"})
    fireEvent.click(screen.getByText("Speichern"))
    await waitFor(() => expect(saveTemplate).toHaveBeenCalled())
    expect(saveTemplate.mock.calls[0][3].attachmentFileId).toBeNull()
  })

  it("lists the service's 400 link messages under „Nicht gespeichert:“", async () => {
    const saveTemplate = vi.fn().mockRejectedValue(new MailTemplateError("x", 400, [
      {field: "bodyHtml", message: "Links zu Kurz-Link-Diensten sind nicht erlaubt: bit.ly"},
      {field: "bodyHtml", message: "Höchstens 3 Links pro Mail"},
      {field: "bodyHtml", message: "Links zu IP-Adressen sind nicht erlaubt"},
    ]))
    await open(LIMITS, saveTemplate)
    fireEvent.click(screen.getByText("Speichern"))
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Nicht gespeichert:"))
    const items = Array.from(screen.getByRole("alert").querySelectorAll("li")).map(li => li.textContent)
    expect(items).toEqual([
      "Links zu Kurz-Link-Diensten sind nicht erlaubt: bit.ly",
      "Höchstens 3 Links pro Mail",
      "Links zu IP-Adressen sind nicht erlaubt",
    ])
  })
})

describe("linkLimitReached (link dialog)", () => {
  const links = (n: number) => `<p>${Array.from({length: n}, (_, i) =>
    i % 2 ? `<a href="mailto:a${i}@example.at">m</a>` : `<a href="https://example.at/${i}">l</a>`).join(" ")}</p>`

  it("refuses a 4th link at maxLinks 3, mailto links included", () => {
    expect(linkLimitReached(links(2), 3)).toBe(false)
    expect(linkLimitReached(links(3), 3)).toBe(true)
  })

  it("does not limit without the number from the service", () => {
    expect(linkLimitReached(links(5), undefined)).toBe(false)
  })
})
