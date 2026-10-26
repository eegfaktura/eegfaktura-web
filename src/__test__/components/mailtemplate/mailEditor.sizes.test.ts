import {afterEach, describe, expect, it} from "vitest";
import {Editor} from "@tiptap/core";
import {NodeSelection} from "@tiptap/pm/state";
import {mailEditorExtensions, toMailHtml} from "../../../components/mailtemplate/mailEditor.extensions";
import {activeFontSize, selectedImageSize, setFontSize, setImageSize} from "../../../components/mailtemplate/mailEditor.sizes";

const IMG = "mailfile:0b5e0b5e-0b5e-4b5e-8b5e-0b5e0b5e0b5e"
const editors: Editor[] = []
const editor = (content: string) => {
  const e = new Editor({extensions: mailEditorExtensions(id => Promise.resolve(`blob:test/${id}`)), content})
  editors.push(e)
  return e
}
const html = (e: Editor) => toMailHtml(e.getHTML())

afterEach(() => {
  editors.splice(0).forEach(e => e.destroy())
})

describe("mail editor font size", () => {
  it("sets small, large and normal on the paragraph at the cursor", () => {
    const e = editor("<p>a</p><p>b</p>")
    e.commands.setTextSelection(2)
    setFontSize(e, "large")
    expect(html(e)).toBe('<p style="font-size: 20px">a</p><p>b</p>')
    expect(activeFontSize(e)).toBe("large")
    setFontSize(e, "small")
    expect(html(e)).toBe('<p style="font-size: 13px">a</p><p>b</p>')
    setFontSize(e, "normal")
    expect(html(e)).toBe("<p>a</p><p>b</p>")
    expect(activeFontSize(e)).toBe("normal")
  })

  it("applies to all selected blocks and combines with text-align", () => {
    const e = editor('<h1>T</h1><p style="text-align: center">a</p>')
    e.commands.selectAll()
    setFontSize(e, "small")
    expect(html(e)).toBe('<h1 style="font-size: 13px">T</h1><p style="text-align: center; font-size: 13px">a</p>')
  })

  it("sizes a list item through its paragraph and replaces a size stored on the item", () => {
    const e = editor('<ul><li style="font-size:20px"><p>x</p></li></ul>')
    expect(html(e)).toBe('<ul><li style="font-size: 20px"><p>x</p></li></ul>')
    e.commands.setTextSelection(3)
    setFontSize(e, "small")
    // the empty paragraph after the list is the editor's usual trailing paragraph
    expect(html(e)).toBe('<ul><li><p style="font-size: 13px">x</p></li></ul><p></p>')
  })

  it("parses the stored sizes and drops other values", () => {
    const e = editor('<p style="font-size:13px;text-align:right">a</p><h2 style="font-size: 20px">b</h2><p style="font-size:30px">c</p>')
    expect(html(e)).toBe('<p style="text-align: right; font-size: 13px">a</p><h2 style="font-size: 20px">b</h2><p>c</p>')
  })
})

describe("mail editor image size", () => {
  const selectImage = (e: Editor) => {
    let pos = -1
    e.state.doc.descendants((n, p) => {
      if (n.type.name === "image") pos = p
    })
    e.view.dispatch(e.state.tr.setSelection(NodeSelection.create(e.state.doc, pos)))
  }

  it("sets the width of the selected image to 200, 400 or 600", () => {
    const e = editor(`<p>a <img src="${IMG}" alt="logo"></p>`)
    expect(selectedImageSize(e)).toBeUndefined()
    selectImage(e)
    expect(selectedImageSize(e)).toBeUndefined()
    setImageSize(e, "medium")
    expect(html(e)).toBe(`<p>a <img src="${IMG}" alt="logo" width="400"></p>`)
    expect(selectedImageSize(e)).toBe("medium")
    setImageSize(e, "large")
    expect(html(e)).toBe(`<p>a <img src="${IMG}" alt="logo" width="600"></p>`)
    setImageSize(e, "small")
    expect(html(e)).toBe(`<p>a <img src="${IMG}" alt="logo" width="200"></p>`)
    expect(selectedImageSize(e)).toBe("small")
  })

  it("reads an existing width", () => {
    const e = editor(`<p><img src="${IMG}" width="600"></p>`)
    selectImage(e)
    expect(selectedImageSize(e)).toBe("large")
  })
})
