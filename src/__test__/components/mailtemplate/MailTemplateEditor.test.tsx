import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import "../../../util/I18n";
import MailTemplateEditor from "../../../components/mailtemplate/MailTemplateEditor.component";
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
      {subject: "Alt", bodyHtml: '<p>Hallo <span data-ph="member.firstName">Vorname</span></p>'}, 3)
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
