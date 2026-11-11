import {Editor} from "@tiptap/react";
import {Node} from "@tiptap/pm/model";
import {EditorView} from "@tiptap/pm/view";
import {IMAGE_WIDTHS} from "./mailEditor.sizes";

// Pasting or dropping an image file goes through the same upload as „Bild einfügen“
// (insertImage); everything else is left to the editor as before.

const IMAGE_TYPES = ["image/png", "image/jpeg"]

// The first PNG/JPEG file of the transfer, like the file input that takes one file.
export const imageFileOf = (data: DataTransfer | null | undefined): File | undefined =>
  Array.from(data?.files || []).find(f => IMAGE_TYPES.includes(f.type))

// insertImage(file, pos): pos undefined = at the cursor
export type InsertImage = (file: File, pos?: number) => void

export const mailImageEditorProps = (insertImage: () => InsertImage) => ({
  handlePaste: (view: EditorView, event: ClipboardEvent) => {
    const file = imageFileOf(event.clipboardData)
    // copied text (e.g. from Word) can come with a picture of itself: paste the text as before;
    // a file copied in Explorer/Finder may come with its name as text: that is an image paste
    const text = event.clipboardData?.getData("text/plain")?.trim()
    if (!file || !view.editable || (text && text !== file.name)) return false
    event.preventDefault()
    insertImage()(file)
    return true
  },
  handleDrop: (view: EditorView, event: DragEvent, _slice: unknown, moved: boolean) => {
    const file = moved ? undefined : imageFileOf(event.dataTransfer)
    if (!file || !view.editable) return false
    event.preventDefault()
    insertImage()(file, view.posAtCoords({left: event.clientX, top: event.clientY})?.pos)
    return true
  },
})

// Inserts the uploaded image. The drop position only holds while the text is unchanged (doc = the text at
// the drop); otherwise, and for paste or „Bild einfügen“, the image goes to the cursor. The editor is only
// focused when it still has the focus, so the upload does not pull the cursor out of e.g. the subject.
// A new image starts in the small size (users' request, 2026-10-28); the size control changes it.
export const insertUploadedImage = (editor: Editor, image: { src: string, alt: string }, pos?: number, doc?: Node) => {
  const at = pos !== undefined && editor.state.doc === doc ? pos : undefined
  const chain = editor.chain()
  const placed = editor.isFocused ? chain.focus(at) : at !== undefined ? chain.setTextSelection(at) : chain
  return placed.setImage({...image, width: IMAGE_WIDTHS.small}).run()
}
