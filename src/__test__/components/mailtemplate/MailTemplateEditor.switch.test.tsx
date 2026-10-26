import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, render as rtlRender, screen, waitFor} from "@testing-library/react";
import {ReactElement} from "react";
import {MemoryRouter} from "react-router";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))

import "../../../util/I18n";
import MailTemplateEditor from "../../../components/mailtemplate/MailTemplateEditor.component";
import {Api} from "../../../service";
import {MailTemplate} from "../../../models/mailtemplate.model";

// the switch „Eigenen Text verwenden“ (off = standard text, editor locked)
const render = (ui: ReactElement) => rtlRender(ui, {wrapper: MemoryRouter})

const template = (customized: boolean): MailTemplate => ({
  key: "zp-active", name: "Zählpunkt aktiv", description: "",
  subject: customized ? "Eigener Betreff" : "Dein Zählpunkt ist aktiv",
  bodyHtml: customized ? "<p>Eigener Text</p>" : "<p>Standard</p>",
  customized, version: customized ? 3 : 0, defaultVersion: 1, defaultChanged: false,
  defaultSubject: "Dein Zählpunkt ist aktiv", defaultBodyHtml: "<p>Standard</p>",
  updatedAt: customized ? "2026-10-22T10:00:00Z" : null, updatedBy: customized ? "admin" : null,
  placeholders: [{key: "member.firstName", label: "Vorname", block: false}],
  files: [],
  limits: {maxImages: 10, maxImageBytes: 1048576, maxAttachments: 1, maxAttachmentBytes: 3145728, maxTotalBytes: 6291456},
})

const STANDARD = "Verschickt wird der Standardtext von eegfaktura."
const NOT_SAVED = "Noch nicht gespeichert – verschickt wird weiterhin der Standardtext."

const setup = (service: Record<string, unknown>) => {
  const onClose = vi.fn()
  const onChanged = vi.fn()
  Api.mailTemplateService = {fetchFile: vi.fn(), ...service} as unknown as typeof Api.mailTemplateService
  const {container} = render(<MailTemplateEditor tenant="RC100100" source="backend" templateKey="zp-active"
                                                 onClose={onClose} onChanged={onChanged}/>)
  const q = (selector: string) => container.querySelector(selector) as any
  return {
    onClose, onChanged,
    editable: () => q(".ProseMirror").getAttribute("contenteditable"),
    text: () => q(".ProseMirror").innerHTML,
    subject: () => q("ion-input"),
    bold: () => q("ion-button[title=\"Fett\"]").disabled,
    save: () => (screen.getByText("Speichern").closest("ion-button") as any).disabled,
    toggle: (checked: boolean) => fireEvent(q("ion-toggle"), new CustomEvent("ionChange", {detail: {checked}})),
    pdfInput: () => q("input[accept=\"application/pdf\"]") as HTMLInputElement,
  }
}

// answers the last question: "confirm" = Ja, "cancel" = Abbrechen
const answer = (role: "confirm" | "cancel") => act(async () => {
  alert.mock.calls[alert.mock.calls.length - 1][0].onDidDismiss({detail: {role}})
})

describe("MailTemplateEditor switch „Eigenen Text verwenden“", () => {
  beforeEach(() => alert.mockReset())

  it("standard: locked with the default text, preview still works, no files section", async () => {
    const preview = vi.fn().mockResolvedValue({subject: "S", html: "<p>x</p>"})
    const e = setup({fetchTemplate: vi.fn().mockResolvedValue({...template(false), subject: "alt"}), preview})
    await waitFor(() => expect(screen.getByText(STANDARD)).toBeTruthy())
    expect(screen.queryByText(NOT_SAVED)).toBeNull()
    expect(screen.queryByText("Auf Standard zurücksetzen")).toBeNull()
    expect([e.editable(), e.subject().disabled, e.bold(), e.save()]).toEqual(["false", true, true, true])
    expect(e.subject().value).toBe("Dein Zählpunkt ist aktiv")
    expect(e.text()).toContain("Standard")
    expect(screen.queryByText("PDF anhängen")).toBeNull()

    fireEvent.click(screen.getByText("Vorschau"))
    await waitFor(() => expect(preview).toHaveBeenCalled())
    expect(preview.mock.calls[0][3]).toMatchObject({subject: "Dein Zählpunkt ist aktiv"})
    expect(preview.mock.calls[0][3]).not.toHaveProperty("useDefault")
  })

  it("switching on unlocks a copy of the default, says it is not saved yet and is not dirty", async () => {
    const saveTemplate = vi.fn().mockResolvedValue(template(true))
    const e = setup({fetchTemplate: vi.fn().mockResolvedValue(template(false)), saveTemplate})
    await waitFor(() => expect(screen.getByText(STANDARD)).toBeTruthy())
    e.toggle(true)
    await waitFor(() => expect(e.editable()).toBe("true"))
    expect(screen.getByText(STANDARD)).toBeTruthy()
    expect(screen.getByText(NOT_SAVED)).toBeTruthy()
    expect([e.subject().disabled, e.bold(), e.save()]).toEqual([false, false, false])
    expect(screen.getByText("PDF anhängen")).toBeTruthy()

    // unlocking alone is no change: back to the list without asking
    fireEvent.click(screen.getByText("Zurück zur Liste"))
    expect(e.onClose).toHaveBeenCalled()
    expect(alert).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText("Speichern"))
    await waitFor(() => expect(screen.getByText(/Verschickt wird eure eigene Fassung \(gespeichert am 22\.10\.2026 .* von admin\)/)).toBeTruthy())
    expect(saveTemplate.mock.calls[0][3]).toMatchObject({subject: "Dein Zählpunkt ist aktiv", bodyHtml: "<p>Standard</p>"})
    expect(e.editable()).toBe("true")
  })

  it("switching off without changes and without saved version does not ask", async () => {
    const e = setup({fetchTemplate: vi.fn().mockResolvedValue(template(false))})
    await waitFor(() => expect(screen.getByText(STANDARD)).toBeTruthy())
    e.toggle(true)
    await waitFor(() => expect(e.editable()).toBe("true"))
    e.toggle(false)
    await waitFor(() => expect(e.editable()).toBe("false"))
    expect(alert).not.toHaveBeenCalled()
    expect(screen.queryByText(NOT_SAVED)).toBeNull()
  })

  it("switching off with unsaved changes asks, then discards them and deletes the uploaded draft", async () => {
    const DRAFT = "55555555-5555-4555-8555-555555555555"
    const uploadFile = vi.fn().mockResolvedValue(
      {id: DRAFT, kind: "attachment", filename: "neu.pdf", mimeType: "application/pdf", size: 1024, committed: false})
    const deleteFile = vi.fn().mockResolvedValue(undefined)
    const e = setup({fetchTemplate: vi.fn().mockResolvedValue(template(false)), uploadFile, deleteFile})
    await waitFor(() => expect(screen.getByText(STANDARD)).toBeTruthy())
    e.toggle(true)
    await waitFor(() => expect(e.editable()).toBe("true"))
    fireEvent(e.subject(), new CustomEvent("ionInput", {detail: {value: "Geändert"}}))
    fireEvent.change(e.pdfInput(), {target: {files: [new File(["%PDF"], "neu.pdf", {type: "application/pdf"})]}})
    await waitFor(() => expect(screen.getByText(/neu\.pdf/)).toBeTruthy())

    // cancelled: everything stays
    e.toggle(false)
    expect(alert.mock.calls[0][0].message).toBe("Änderungen verwerfen und beim Standardtext bleiben?")
    expect(alert.mock.calls[0][0].buttons.map((b: { text: string }) => b.text)).toEqual(["Abbrechen", "Ja"])
    await answer("cancel")
    expect(e.editable()).toBe("true")
    expect(e.subject().value).toBe("Geändert")
    expect(deleteFile).not.toHaveBeenCalled()

    e.toggle(false)
    await answer("confirm")
    await waitFor(() => expect(deleteFile).toHaveBeenCalledWith("backend", "RC100100", "zp-active", DRAFT))
    expect(e.editable()).toBe("false")
    expect(e.subject().value).toBe("Dein Zählpunkt ist aktiv")
    expect(screen.queryByText(NOT_SAVED)).toBeNull()
    expect(screen.queryByText(/neu\.pdf/)).toBeNull()

    // discarded: nothing left to lose
    fireEvent.click(screen.getByText("Zurück zur Liste"))
    expect(e.onClose).toHaveBeenCalled()
    expect(alert).toHaveBeenCalledTimes(2)
  })

  it("switching off with a saved version asks, then deletes it (reset) and locks the standard text", async () => {
    const fetchTemplate = vi.fn().mockResolvedValueOnce(template(true)).mockResolvedValue(template(false))
    const resetTemplate = vi.fn().mockResolvedValue(undefined)
    const e = setup({fetchTemplate, resetTemplate})
    await waitFor(() => expect(screen.getByText(/Verschickt wird eure eigene Fassung/)).toBeTruthy())
    expect(e.editable()).toBe("true")

    e.toggle(false)
    expect(alert.mock.calls[0][0].message)
      .toBe("Eigene Fassung löschen und wieder den Standardtext verschicken? Bilder und PDF-Anhang werden mit gelöscht.")
    await answer("cancel")
    expect(resetTemplate).not.toHaveBeenCalled()
    expect(e.editable()).toBe("true")

    e.toggle(false)
    await answer("confirm")
    await waitFor(() => expect(screen.getByText(STANDARD)).toBeTruthy())
    expect(resetTemplate).toHaveBeenCalledWith("backend", "RC100100", "zp-active")
    expect(e.onChanged).toHaveBeenCalled()
    expect(e.editable()).toBe("false")
    expect(e.subject().value).toBe("Dein Zählpunkt ist aktiv")
    expect((document.querySelector("ion-toggle") as any).checked).toBe(false)
  })

  it("shows the saved version without user", async () => {
    setup({fetchTemplate: vi.fn().mockResolvedValue({...template(true), updatedBy: null})})
    await waitFor(() => expect(screen.getByText(/^Verschickt wird eure eigene Fassung \(gespeichert am 22\.10\.2026 [0-9:]+\)\.$/)).toBeTruthy())
  })
})
