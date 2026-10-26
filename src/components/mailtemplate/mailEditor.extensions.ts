import {Editor, Extensions, Node} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import {ALLOWED_FONT_SIZES, MailFontSize} from "./mailEditor.sizes";

// Editor model of the editable member mails (konzept-mail-texte-editierbar.md, section H).
// The stored HTML may only contain:
//   p, br, strong, b, em, i, u, h1-h3, ul, ol, li, blockquote, a[href https:|mailto:],
//   img[src mailfile:, alt, width], span[data-ph], div[data-ph];
//   style only "text-align: left|center|right" and "font-size: 13px|20px" on p, h1-h3, li.
// The services sanitise again (mail-html-policy.json); toMailHtml keeps the editor output inside
// that list so a save is not changed behind the user's back.

export const MAILFILE_PREFIX = "mailfile:"

// A file id is a UUID or the built-in logo of the default texts; anything else is not a mail file.
const MAIL_FILE_ID = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|eegfaktura-logo)$/i

export const mailFileId = (src: string | null | undefined): string | undefined => {
  const id = src && src.startsWith(MAILFILE_PREFIX) ? src.substring(MAILFILE_PREFIX.length) : undefined
  return id && MAIL_FILE_ID.test(id) ? id : undefined
}

const placeholderAttributes = () => ({
  key: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("data-ph"),
    renderHTML: () => ({}),
  },
  label: {
    default: "",
    parseHTML: (el: HTMLElement) => el.textContent || "",
    renderHTML: () => ({}),
  },
})

const chipView = (tag: "span" | "div", className: string) => ({node}: { node: { attrs: Record<string, any> } }) => {
  const dom = document.createElement(tag)
  dom.className = className
  dom.contentEditable = "false"
  dom.textContent = node.attrs.label || node.attrs.key
  return {dom}
}

// <span data-ph="member.firstName">Vorname</span> — not editable, shown as a chip.
export const PlaceholderInline = Node.create({
  name: "placeholderInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: placeholderAttributes,
  parseHTML() {
    return [{tag: "span[data-ph]"}]
  },
  renderHTML({node}) {
    return ["span", {"data-ph": node.attrs.key}, node.attrs.label || node.attrs.key]
  },
  renderText({node}) {
    return node.attrs.label || node.attrs.key
  },
  addNodeView() {
    return chipView("span", "mail-ph mail-ph-inline")
  },
})

// The document allows block placeholders only at the top level (section H: not inside a paragraph,
// list or quote; the services answer 400 otherwise).
const MailDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "(block | mailBlock)+",
})

// <div data-ph="eeg.contactBlock">Kontaktblock</div> — a block the service fills (lists, contact lines).
export const PlaceholderBlock = Node.create({
  name: "placeholderBlock",
  group: "mailBlock",
  atom: true,
  selectable: true,
  addAttributes: placeholderAttributes,
  parseHTML() {
    return [{tag: "div[data-ph]"}]
  },
  renderHTML({node}) {
    return ["div", {"data-ph": node.attrs.key}, node.attrs.label || node.attrs.key]
  },
  addNodeView() {
    return chipView("div", "mail-ph mail-ph-block")
  },
})

// Images keep src="mailfile:{id}" in the document; only the editor view shows them through a
// blob URL (authenticated fetch), so getHTML() always returns the mailfile: reference.
export const createMailImage = (resolveImage: (id: string) => Promise<string>) => Image.extend({
  parseHTML() {
    return [{
      tag: `img[src^="${MAILFILE_PREFIX}"]`,
      getAttrs: el => mailFileId(el.getAttribute("src")) ? null : false,
    }]
  },
  addNodeView() {
    return ({node}) => {
      const dom = document.createElement("img")
      const id = mailFileId(node.attrs.src)
      dom.alt = node.attrs.alt || ""
      if (node.attrs.width) {
        dom.setAttribute("width", String(node.attrs.width))
      }
      if (id) {
        resolveImage(id).then(url => dom.src = url).catch(() => dom.classList.add("mail-img-missing"))
      }
      return {dom}
    }
  },
}).configure({inline: true, allowBase64: false})

export const mailEditorExtensions = (resolveImage: (id: string) => Promise<string>): Extensions => [
  StarterKit.configure({
    document: false,
    heading: {levels: [1, 2, 3]},
    code: false,
    codeBlock: false,
    strike: false,
    horizontalRule: false,
    link: false,
    underline: false,
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: false,
    HTMLAttributes: {target: null, rel: null, class: null},
    isAllowedUri: (url) => /^(https:|mailto:)/i.test(url.trim()),
  }),
  TextAlign.configure({types: ["heading", "paragraph"], alignments: ["left", "center", "right"]}),
  MailFontSize,
  createMailImage(resolveImage),
  MailDocument,
  PlaceholderInline,
  PlaceholderBlock,
]

// Inline placeholders go to the cursor; a block placeholder goes after the top-level block that
// holds the cursor (never into a paragraph, list or quote).
export const insertPlaceholder = (editor: Editor, ph: { key: string, label: string, block: boolean }) => {
  const attrs = {key: ph.key, label: ph.label}
  if (!ph.block) {
    return editor.chain().focus().insertContent({type: "placeholderInline", attrs}).run()
  }
  const {$from} = editor.state.selection
  const pos = $from.depth === 0 ? $from.pos : $from.after(1)
  return editor.chain().focus().insertContentAt(pos, {type: "placeholderBlock", attrs}).run()
}

// Loads content (stored version, default, reload) without an undo step, so undo cannot go back
// to an empty editor or to the text before a reload.
export const setContentWithoutHistory = (editor: Editor, html: string) =>
  editor.chain().setMeta("addToHistory", false).setContent(html, {emitUpdate: false}).run()

// Sets, changes or (empty href) removes the link at the selection. Without a selection and outside a
// link the address itself is inserted as linked text, so the click always has a visible result.
export const applyLink = (editor: Editor, href: string) => {
  const chain = editor.chain().focus()
  if (!href) {
    return chain.extendMarkRange("link").unsetLink().run()
  }
  if (editor.state.selection.empty && !editor.isActive("link")) {
    const text = href.replace(/^mailto:/i, "")
    return chain.insertContent({type: "text", text, marks: [{type: "link", attrs: {href}}]}).run()
  }
  return chain.extendMarkRange("link").setLink({href}).run()
}

// Removes every image of the given file from the text; returns whether there was one.
export const removeMailImages = (editor: Editor, id: string) => {
  const positions: number[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && mailFileId(node.attrs.src) === id) positions.push(pos)
  })
  if (positions.length === 0) return false
  const tr = editor.state.tr
  positions.reverse().forEach(pos => tr.delete(pos, pos + 1))
  editor.view.dispatch(tr)
  return true
}

// Replaces the text as a user edit (e.g. "Neuen Standard übernehmen"): one undo step brings the old text back.
export const replaceContent = (editor: Editor, html: string) =>
  editor.chain().setContent(html).run()

const ALLOWED: Record<string, string[]> = {
  p: ["style"], br: [], strong: [], b: [], em: [], i: [], u: [],
  h1: ["style"], h2: ["style"], h3: ["style"],
  ul: [], ol: [], li: ["style"], blockquote: [],
  a: ["href"], img: ["src", "alt", "width"],
  span: ["data-ph"], div: ["data-ph"],
}

const unwrap = (el: Element) => {
  el.replaceWith(...Array.from(el.childNodes))
}

// The value of the last declaration of a property (the one the browser applies), lower case; "" without one.
const lastDeclaration = (style: string, property: string) => {
  const values = Array.from(style.matchAll(new RegExp(`(?:^|;)\\s*${property}\\s*:([^;]*)`, "gi")))
  return values.length > 0 ? values[values.length - 1][1].trim().toLowerCase() : ""
}

const cleanElement = (el: Element) => {
  Array.from(el.children).forEach(cleanElement)
  const tag = el.tagName.toLowerCase()
  const allowed = ALLOWED[tag]
  if (!allowed) {
    unwrap(el)
    return
  }
  for (const attr of Array.from(el.attributes)) {
    if (!allowed.includes(attr.name)) {
      el.removeAttribute(attr.name)
    }
  }
  const style = el.getAttribute("style")
  if (style !== null) {
    const align = lastDeclaration(style, "text-align")
    const size = lastDeclaration(style, "font-size")
    const kept = [
      ["left", "center", "right"].includes(align) ? `text-align: ${align}` : "",
      ALLOWED_FONT_SIZES.includes(size) ? `font-size: ${size}` : "",
    ].filter(d => d)
    if (kept.length > 0) {
      el.setAttribute("style", kept.join("; "))
    } else {
      el.removeAttribute("style")
    }
  }
  if (tag === "a" && !/^(https:|mailto:)/i.test((el.getAttribute("href") || "").trim())) {
    unwrap(el)
  } else if (tag === "img" && !mailFileId(el.getAttribute("src"))) {
    el.remove()
  } else if ((tag === "span" || tag === "div") && !el.getAttribute("data-ph")) {
    unwrap(el)
  }
}

// Reduces editor HTML to the allowed list above (section H).
export const toMailHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html")
  Array.from(doc.body.children).forEach(cleanElement)
  return doc.body.innerHTML
}
