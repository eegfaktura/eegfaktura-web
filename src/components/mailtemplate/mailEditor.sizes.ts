import {Editor, Extension} from "@tiptap/core";

// Fixed sizes of the mail editor: three font sizes per block (p, h1-h3, li) and three image widths.
// The services allow exactly these values (mail-html-policy.json version 2); toMailHtml mirrors that.

export type FontSize = "small" | "normal" | "large"

// "normal" has no style
export const FONT_SIZE_VALUES: Record<Exclude<FontSize, "normal">, string> = {small: "13px", large: "20px"}
export const ALLOWED_FONT_SIZES = Object.values(FONT_SIZE_VALUES)

export type ImageSize = "small" | "medium" | "large"

export const IMAGE_WIDTHS: Record<ImageSize, number> = {small: 200, medium: 400, large: 600}

const TEXT_BLOCKS = ["paragraph", "heading"]

// Global attribute fontSize on paragraphs, headings and list items, rendered as style="font-size: …"
// (merged with text-align into one style attribute).
export const MailFontSize = Extension.create({
  name: "mailFontSize",
  addGlobalAttributes() {
    return [{
      types: [...TEXT_BLOCKS, "listItem"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => ALLOWED_FONT_SIZES.includes(el.style.fontSize) ? el.style.fontSize : null,
          renderHTML: (attrs: Record<string, any>) =>
            ALLOWED_FONT_SIZES.includes(attrs.fontSize) ? {style: `font-size: ${attrs.fontSize}`} : {},
        },
      },
    }]
  },
})

// Sets the size of the block(s) at the selection. In a list the paragraph inside the item carries it;
// a size stored on the item itself (<li style="font-size: …">) is cleared, so the new choice is what shows.
export const setFontSize = (editor: Editor, size: FontSize) => {
  const fontSize = size === "normal" ? null : FONT_SIZE_VALUES[size]
  return editor.chain().focus()
    .command(({commands}) => {
      commands.updateAttributes("listItem", {fontSize: null})
      return TEXT_BLOCKS.map(type => commands.updateAttributes(type, {fontSize})).some(r => r)
    })
    .run()
}

export const activeFontSize = (editor: Editor): FontSize => {
  const value = editor.getAttributes("paragraph").fontSize || editor.getAttributes("heading").fontSize
  return value === FONT_SIZE_VALUES.small ? "small" : value === FONT_SIZE_VALUES.large ? "large" : "normal"
}

// Width of the selected image as one of the fixed sizes; undefined without image or with another width.
export const selectedImageSize = (editor: Editor): ImageSize | undefined => {
  if (!editor.isActive("image")) return undefined
  const width = Number(editor.getAttributes("image").width)
  return (Object.keys(IMAGE_WIDTHS) as ImageSize[]).find(k => IMAGE_WIDTHS[k] === width)
}

// The update replaces the image node; selecting it again keeps the size control open.
export const setImageSize = (editor: Editor, size: ImageSize) => {
  const pos = editor.state.selection.from
  return editor.chain().focus().updateAttributes("image", {width: IMAGE_WIDTHS[size]}).setNodeSelection(pos).run()
}
