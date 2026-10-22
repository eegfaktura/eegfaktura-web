import {Extensions, mergeAttributes, Node} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";

// Editor model of the editable member mails (konzept-mail-texte-editierbar.md, section H).
// The stored HTML may only contain:
//   p, br, strong, b, em, i, u, h1-h3, ul, ol, li, blockquote, a[href https:|mailto:],
//   img[src mailfile:, alt, width], span[data-ph], div[data-ph];
//   style only "text-align: left|center|right" on p, h1-h3, li.
// The services sanitise again (mail-html-policy.json); toMailHtml keeps the editor output inside
// that list so a save is not changed behind the user's back.

export const MAILFILE_PREFIX = "mailfile:"

export const mailFileId = (src: string | null | undefined): string | undefined =>
  src && src.startsWith(MAILFILE_PREFIX) ? src.substring(MAILFILE_PREFIX.length) : undefined

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

// <div data-ph="eeg.contactBlock">Kontaktblock</div> — a block the service fills (lists, contact lines).
export const PlaceholderBlock = Node.create({
  name: "placeholderBlock",
  group: "block",
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
    return [{tag: `img[src^="${MAILFILE_PREFIX}"]`}]
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
  createMailImage(resolveImage),
  PlaceholderInline,
  PlaceholderBlock,
]

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
    const m = /(?:^|;)\s*text-align\s*:\s*(left|center|right)\s*(?:;|$)/i.exec(style)
    if (m) {
      el.setAttribute("style", `text-align: ${m[1].toLowerCase()}`)
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
