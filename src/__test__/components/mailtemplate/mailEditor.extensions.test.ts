import {afterEach, describe, expect, it} from "vitest";
import {Editor} from "@tiptap/core";
import {mailEditorExtensions, mailFileId, setContentWithoutHistory, toMailHtml} from "../../../components/mailtemplate/mailEditor.extensions";

const editors: Editor[] = []
const editor = (content: string, resolve = (id: string) => Promise.resolve(`blob:test/${id}`)) => {
  const e = new Editor({extensions: mailEditorExtensions(resolve), content})
  editors.push(e)
  return e
}
const flush = () => new Promise(r => setTimeout(r, 0))

afterEach(() => {
  editors.splice(0).forEach(e => e.destroy())
})

describe("mail editor serialization", () => {

  it("keeps inline and block placeholders as span/div with data-ph", () => {
    const html = '<p>Hallo <span data-ph="member.firstName">Vorname</span>!</p><div data-ph="eeg.contactBlock">Kontakt</div>'
    expect(toMailHtml(editor(html).getHTML())).toBe(html)
  })

  it("inserts a placeholder node from the picker as a span with its label", () => {
    const e = editor("<p>Hallo</p>")
    e.chain().focus("end").insertContent({type: "placeholderInline", attrs: {key: "member.lastName", label: "Nachname"}}).run()
    e.chain().focus("end").insertContent({type: "placeholderBlock", attrs: {key: "meteringPoints", label: "Zählpunkte"}}).run()
    expect(toMailHtml(e.getHTML()))
      .toBe('<p>Hallo<span data-ph="member.lastName">Nachname</span></p><div data-ph="meteringPoints">Zählpunkte</div><p></p>')
  })

  it("shows placeholders as non-editable chips", () => {
    const e = editor('<p><span data-ph="eeg.name">Name der EEG</span></p>')
    const chip = e.view.dom.querySelector(".mail-ph-inline") as HTMLElement
    expect(chip.textContent).toBe("Name der EEG")
    expect(chip.contentEditable).toBe("false")
  })

  it("shows mailfile images through a blob URL but saves mailfile:{id}", async () => {
    const e = editor('<p style="text-align: center"><img src="mailfile:0b5e" alt="Logo"></p>')
    await flush()
    expect((e.view.dom.querySelector("img:not(.ProseMirror-separator)") as HTMLImageElement).getAttribute("src")).toBe("blob:test/0b5e")
    expect(toMailHtml(e.getHTML())).toBe('<p style="text-align: center"><img src="mailfile:0b5e" alt="Logo"></p>')
  })

  it("keeps the built-in logo reference (not a UUID) and shows it through the same fetch", async () => {
    const e = editor('<p><img src="mailfile:eegfaktura-logo" width="335"></p>')
    await flush()
    expect((e.view.dom.querySelector("img:not(.ProseMirror-separator)") as HTMLImageElement).getAttribute("src"))
      .toBe("blob:test/eegfaktura-logo")
    expect(toMailHtml(e.getHTML())).toBe('<p><img src="mailfile:eegfaktura-logo" width="335"></p>')
  })

  it("drops external images and links that are not https/mailto", () => {
    const e = editor('<p><img src="https://evil.example/x.png"><a href="http://x.example">http</a> ' +
      '<a href="https://ok.example">https</a> <a href="mailto:a@b.at">mail</a></p>')
    expect(toMailHtml(e.getHTML()))
      .toBe('<p>http <a href="https://ok.example">https</a> <a href="mailto:a@b.at">mail</a></p>')
  })

  it("serializes the toolbar formats with allowed tags only", () => {
    const html = '<h1 style="text-align: right">T</h1><h2>U</h2><h3>V</h3>' +
      '<p><strong>b</strong> <em>i</em> <u>u</u><br>x</p><ul><li><p>a</p></li></ul><ol><li><p>b</p></li></ol>' +
      '<blockquote><p>q</p></blockquote>'
    expect(toMailHtml(editor(html).getHTML())).toBe(html)
  })
})

describe("setContentWithoutHistory", () => {
  it("loads content that undo does not take back, while edits stay undoable", () => {
    const e = editor("")
    setContentWithoutHistory(e, "<p>Gespeichert</p>")
    expect(e.can().undo()).toBe(false)
    e.chain().focus("end").insertContent("!").run()
    expect(e.can().undo()).toBe(true)
    setContentWithoutHistory(e, "<p>Neu geladen</p>")
    e.commands.undo()
    expect(e.getHTML()).toBe("<p>Neu geladen</p>")
  })
})

describe("toMailHtml", () => {
  it("removes attributes, styles and elements outside the policy", () => {
    expect(toMailHtml('<p style="color:red; text-align:center" class="x" onclick="a()">a</p>'))
      .toBe('<p style="text-align: center">a</p>')
    expect(toMailHtml('<p style="color:red">a</p>')).toBe("<p>a</p>")
    expect(toMailHtml('<ol start="3" type="a"><li>x</li></ol>')).toBe("<ol><li>x</li></ol>")
    expect(toMailHtml('<a href="https://x.at" target="_blank" rel="nofollow">x</a>')).toBe('<a href="https://x.at">x</a>')
    expect(toMailHtml('<a href="javascript:alert(1)">x</a>')).toBe("x")
    expect(toMailHtml('<span>a</span><div>b</div><code>c</code>')).toBe("abc")
    expect(toMailHtml('<img src="data:image/png;base64,AAAA">')).toBe("")
    expect(toMailHtml('<img src="mailfile:1" width="300" height="20" title="t">')).toBe('<img src="mailfile:1" width="300">')
  })

  it("extracts the file id from a mailfile reference", () => {
    expect(mailFileId("mailfile:abc")).toBe("abc")
    expect(mailFileId("blob:abc")).toBeUndefined()
    expect(mailFileId(null)).toBeUndefined()
  })
})
