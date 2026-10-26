import {beforeAll, describe, expect, it, vi} from "vitest";
import {act, fireEvent, render as rtlRender, screen, waitFor} from "@testing-library/react";
import {ReactElement} from "react";
import {MemoryRouter} from "react-router";
import "../../../util/I18n";
import MailTemplateEditor from "../../../components/mailtemplate/MailTemplateEditor.component";
import {Api} from "../../../service";
import {MailTemplate} from "../../../models/mailtemplate.model";

// createImageBitmap does not exist in jsdom; the scaling itself has its own tests
vi.mock("../../../util/ImageScale.util", () => ({downscaleImage: vi.fn(async (f: File) => f)}))

const render = (ui: ReactElement) => rtlRender(ui, {wrapper: MemoryRouter})

// jsdom has no layout; the editor scrolls the cursor into view after focus()
beforeAll(() => {
  Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
})

const UPLOADED = "55555555-5555-4555-8555-555555555555"
const FOOTER = "versandt durch EEG Faktura, ein Service des VFEEG - https://vfeeg.org/"

const template = (customized: boolean, extra: Partial<MailTemplate> = {}): MailTemplate => ({
  key: "zp-active", name: "Zählpunkt aktiv", description: "wird verschickt, wenn …",
  subject: "S", bodyHtml: "<p>Hallo</p>",
  customized, version: customized ? 3 : 0, defaultVersion: 2, defaultChanged: false,
  defaultSubject: "Standard", defaultBodyHtml: "<p>Standard</p>",
  placeholders: [], files: [],
  limits: {maxImages: 10, maxImageBytes: 1048576, maxAttachments: 1, maxAttachmentBytes: 3145728, maxTotalBytes: 6291456},
  ...extra,
})

const setup = (tpl: MailTemplate) => {
  const uploadFile = vi.fn().mockResolvedValue(
    {id: UPLOADED, kind: "image", filename: "bild.png", mimeType: "image/png", size: 3, committed: false})
  const saveTemplate = vi.fn().mockResolvedValue(tpl)
  Api.mailTemplateService = {
    fetchTemplate: vi.fn().mockResolvedValue(tpl), saveTemplate, uploadFile,
    fetchFile: vi.fn().mockResolvedValue(new Blob(["x"])),
  } as unknown as typeof Api.mailTemplateService
  const {container} = render(<MailTemplateEditor tenant="RC100100" source="backend" templateKey="zp-active"
                                                 onClose={vi.fn()} onChanged={vi.fn()}/>)
  const pm = () => container.querySelector(".ProseMirror") as HTMLElement
  return {uploadFile, saveTemplate, pm}
}

const png = () => new File(["png"], "bild.png", {type: "image/png"})
const clipboard = (files: File[], text = "") => ({files, types: [], getData: (type: string) => type === "text/plain" ? text : ""})

const savedBody = async (saveTemplate: ReturnType<typeof vi.fn>) => {
  fireEvent.click(screen.getByText("Speichern"))
  await waitFor(() => expect(saveTemplate).toHaveBeenCalled())
  return saveTemplate.mock.calls[0][3].bodyHtml as string
}

describe("MailTemplateEditor sizes", () => {
  // Ionic moves aria-label into the shadow button once hydrated; the title stays on the host
  const sizeButton = (title: string) => document.querySelector(`ion-button[title="${title}"]`) as any
  const disabled = (title: string) => sizeButton(title).disabled

  it("locks the font size with the own text switched off", async () => {
    setup(template(false))
    await waitFor(() => expect(screen.getByText("Verschickt wird der Standardtext von eegfaktura.")).toBeTruthy())
    expect(screen.getByRole("group", {name: "Schriftgröße"})).toBeTruthy()
    expect(["Schriftgröße: Klein", "Schriftgröße: Normal", "Schriftgröße: Groß"].map(disabled)).toEqual([true, true, true])
  })

  it("sets the font size of the paragraph with the own text switched on", async () => {
    const {saveTemplate} = setup(template(true))
    await waitFor(() => expect(screen.getByText(/Verschickt wird eure eigene Fassung/)).toBeTruthy())
    expect(disabled("Schriftgröße: Groß")).toBe(false)
    // no image selected: no image size
    expect(screen.queryByRole("group", {name: "Bildgröße"})).toBeNull()
    fireEvent.click(sizeButton("Schriftgröße: Groß"))
    expect(await savedBody(saveTemplate)).toBe('<p style="font-size: 20px">Hallo</p>')
  })
})

describe("MailTemplateEditor image size", () => {
  it("offers the image size while an image is selected", async () => {
    const IMG = "66666666-6666-4666-8666-666666666666"
    const {saveTemplate, pm} = setup(template(true, {bodyHtml: `<p><img src="mailfile:${IMG}" alt="logo.png">Hallo</p>`}))
    await waitFor(() => expect(pm().getAttribute("contenteditable")).toBe("true"))
    expect(screen.queryByRole("group", {name: "Bildgröße"})).toBeNull()
    act(() => (pm() as any).editor.commands.setNodeSelection(1))
    await waitFor(() => expect(screen.getByRole("group", {name: "Bildgröße"})).toBeTruthy())
    fireEvent.click(document.querySelector('ion-button[title="Bildgröße: Mittel"]')!)
    expect(await savedBody(saveTemplate)).toBe(`<p><img src="mailfile:${IMG}" alt="logo.png" width="400">Hallo</p>`)
  })
})

describe("MailTemplateEditor fixed footer", () => {
  it("shows the footer the service appends below the text", async () => {
    setup(template(true, {fixedFooter: FOOTER}))
    await waitFor(() => expect(screen.getByText(`Wird immer angehängt: ${FOOTER}`)).toBeTruthy())
  })

  it("shows nothing without the field (older service)", async () => {
    setup(template(true))
    await waitFor(() => expect(screen.getByText("Zählpunkt aktiv")).toBeTruthy())
    expect(screen.queryByText(/Wird immer angehängt/)).toBeNull()
  })
})

describe("MailTemplateEditor paste and drop of images", () => {
  it("uploads a pasted image like „Bild einfügen“ and inserts it at the cursor", async () => {
    const {uploadFile, saveTemplate, pm} = setup(template(true))
    await waitFor(() => expect(pm().getAttribute("contenteditable")).toBe("true"))
    const file = png()
    fireEvent.paste(pm(), {clipboardData: clipboard([file])})
    await waitFor(() => expect(uploadFile).toHaveBeenCalledWith("backend", "RC100100", "zp-active", file, "bild.png", "image"))
    await waitFor(() => expect(screen.getByText(/bild\.png/).textContent).toContain("Entwurf"))
    expect(await savedBody(saveTemplate)).toContain(`<img src="mailfile:${UPLOADED}" alt="bild.png">`)
  })

  it("uploads a dropped image and inserts it at the drop position", async () => {
    const {uploadFile, saveTemplate, pm} = setup(template(true))
    await waitFor(() => expect(pm().getAttribute("contenteditable")).toBe("true"))
    // jsdom has no layout: the drop lands before "Hallo"
    vi.spyOn((pm() as any).editor.view, "posAtCoords").mockReturnValue({pos: 1, inside: -1})
    fireEvent.drop(pm(), {dataTransfer: clipboard([png()]), clientX: 1, clientY: 1})
    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText(/bild\.png/)).toBeTruthy())
    expect(await savedBody(saveTemplate)).toBe(`<p><img src="mailfile:${UPLOADED}" alt="bild.png">Hallo</p>`)
  })

  it("uploads a file copied in Explorer/Finder that comes with its name as text", async () => {
    const {uploadFile, saveTemplate, pm} = setup(template(true))
    await waitFor(() => expect(pm().getAttribute("contenteditable")).toBe("true"))
    fireEvent.paste(pm(), {clipboardData: clipboard([png()], "bild.png")})
    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText(/bild\.png/)).toBeTruthy())
    const body = await savedBody(saveTemplate)
    expect(body).toContain(`<img src="mailfile:${UPLOADED}" alt="bild.png">`)
    expect(body).not.toContain("bild.pngHallo")
  })

  it("puts a dropped image at the cursor when the text changed during the upload", async () => {
    const {uploadFile, saveTemplate, pm} = setup(template(true))
    let finish: () => void = () => undefined
    uploadFile.mockReturnValueOnce(new Promise(r => finish = () =>
      r({id: UPLOADED, kind: "image", filename: "bild.png", mimeType: "image/png", size: 3, committed: false})))
    await waitFor(() => expect(pm().getAttribute("contenteditable")).toBe("true"))
    const editor = (pm() as any).editor
    vi.spyOn(editor.view, "posAtCoords").mockReturnValue({pos: 1, inside: -1})
    fireEvent.drop(pm(), {dataTransfer: clipboard([png()]), clientX: 1, clientY: 1})
    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1))
    // typed before "Hallo" meanwhile; the cursor ends after "Neu "
    act(() => editor.commands.insertContentAt(1, "Neu "))
    await act(async () => finish())
    await waitFor(() => expect(screen.getByText(/bild\.png/)).toBeTruthy())
    expect(await savedBody(saveTemplate)).toBe(`<p>Neu <img src="mailfile:${UPLOADED}" alt="bild.png">Hallo</p>`)
  })

  it("does not take the focus back from the subject when a pasted image arrives", async () => {
    const {uploadFile, saveTemplate, pm} = setup(template(true))
    let finish: () => void = () => undefined
    uploadFile.mockReturnValueOnce(new Promise(r => finish = () =>
      r({id: UPLOADED, kind: "image", filename: "bild.png", mimeType: "image/png", size: 3, committed: false})))
    await waitFor(() => expect(pm().getAttribute("contenteditable")).toBe("true"))
    fireEvent.paste(pm(), {clipboardData: clipboard([png()])})
    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1))
    const other = document.body.appendChild(document.createElement("input"))
    other.focus()
    await act(async () => finish())
    await waitFor(() => expect(screen.getByText(/bild\.png/)).toBeTruthy())
    expect(document.activeElement).toBe(other)
    expect(await savedBody(saveTemplate)).toContain(`<img src="mailfile:${UPLOADED}" alt="bild.png">`)
    other.remove()
  })

  it("pastes text as before, also when it comes with a picture of itself", async () => {
    const {uploadFile, saveTemplate, pm} = setup(template(true))
    await waitFor(() => expect(pm().getAttribute("contenteditable")).toBe("true"))
    fireEvent.paste(pm(), {clipboardData: clipboard([], " Welt")})
    fireEvent.paste(pm(), {clipboardData: clipboard([png()], " aus Word")})
    fireEvent.paste(pm(), {clipboardData: clipboard([new File(["gif"], "a.gif", {type: "image/gif"})])})
    await new Promise(r => setTimeout(r, 0))
    expect(uploadFile).not.toHaveBeenCalled()
    expect(await savedBody(saveTemplate)).toContain("Welt aus Word")
  })

  it("ignores a second paste while the first upload runs", async () => {
    const {uploadFile, saveTemplate, pm} = setup(template(true))
    let finish: () => void = () => undefined
    uploadFile.mockReturnValueOnce(new Promise(r => finish = () =>
      r({id: UPLOADED, kind: "image", filename: "bild.png", mimeType: "image/png", size: 3, committed: false})))
    await waitFor(() => expect(pm().getAttribute("contenteditable")).toBe("true"))
    fireEvent.paste(pm(), {clipboardData: clipboard([png()])})
    fireEvent.paste(pm(), {clipboardData: clipboard([png()])})
    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1))
    await act(async () => finish())
    await waitFor(() => expect(screen.getByText(/bild\.png/)).toBeTruthy())
    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect((await savedBody(saveTemplate)).match(/<img/g)).toHaveLength(1)
  })

  it("does not upload with the own text switched off", async () => {
    const {uploadFile, pm} = setup(template(false))
    await waitFor(() => expect(screen.getByText("Verschickt wird der Standardtext von eegfaktura.")).toBeTruthy())
    expect(pm().getAttribute("contenteditable")).toBe("false")
    fireEvent.paste(pm(), {clipboardData: clipboard([png()])})
    fireEvent.drop(pm(), {dataTransfer: clipboard([png()]), clientX: 1, clientY: 1})
    await new Promise(r => setTimeout(r, 0))
    expect(uploadFile).not.toHaveBeenCalled()
  })
})
