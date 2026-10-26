import {afterEach, describe, expect, it, vi} from "vitest";
import {Editor} from "@tiptap/core";
import {applyLink, insertPlaceholder, mailEditorExtensions, mailFileId, replaceContent, setContentWithoutHistory, toMailHtml} from "../../../components/mailtemplate/mailEditor.extensions";

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
    const e = editor('<p style="text-align: center"><img src="mailfile:0b5e0b5e-0b5e-4b5e-8b5e-0b5e0b5e0b5e" alt="Logo"></p>')
    await flush()
    expect((e.view.dom.querySelector("img:not(.ProseMirror-separator)") as HTMLImageElement).getAttribute("src")).toBe("blob:test/0b5e0b5e-0b5e-4b5e-8b5e-0b5e0b5e0b5e")
    expect(toMailHtml(e.getHTML())).toBe('<p style="text-align: center"><img src="mailfile:0b5e0b5e-0b5e-4b5e-8b5e-0b5e0b5e0b5e" alt="Logo"></p>')
  })

  it("keeps the built-in logo reference (not a UUID) and shows it through the same fetch", async () => {
    const e = editor('<p><img src="mailfile:eegfaktura-logo" width="335"></p>')
    await flush()
    expect((e.view.dom.querySelector("img:not(.ProseMirror-separator)") as HTMLImageElement).getAttribute("src"))
      .toBe("blob:test/eegfaktura-logo")
    expect(toMailHtml(e.getHTML())).toBe('<p><img src="mailfile:eegfaktura-logo" width="335"></p>')
  })

  it("drops images whose mailfile id is neither a UUID nor the built-in logo", () => {
    const resolve = vi.fn((id: string) => Promise.resolve(`blob:test/${id}`))
    const e = editor('<p><img src="mailfile:../../x"><img src="mailfile:abc"></p>', resolve)
    expect(toMailHtml(e.getHTML())).toBe("<p></p>")
    expect(resolve).not.toHaveBeenCalled()
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

describe("block placeholders", () => {
  const block = {key: "eeg.contactBlock", label: "Kontakt", block: true}

  it("are inserted after the paragraph, list or quote that holds the cursor", () => {
    const e = editor("<p>Hallo Welt</p><ul><li><p>Punkt</p></li></ul><blockquote><p>Zitat</p></blockquote>")
    e.commands.setTextSelection(4)
    insertPlaceholder(e, block)
    let punkt = 0
    e.state.doc.descendants((n, pos) => {
      if (n.isText && n.text === "Punkt") punkt = pos
    })
    e.commands.setTextSelection(punkt + 2)
    expect(e.isActive("listItem")).toBe(true)
    insertPlaceholder(e, block)
    expect(toMailHtml(e.getHTML())).toBe('<p>Hallo Welt</p><div data-ph="eeg.contactBlock">Kontakt</div>' +
      '<ul><li><p>Punkt</p></li></ul><div data-ph="eeg.contactBlock">Kontakt</div><blockquote><p>Zitat</p></blockquote><p></p>')
  })

  it("never end up inside a list, also not from loaded HTML", () => {
    const html = toMailHtml(editor('<ul><li><div data-ph="meteringPoints">Zählpunkte</div></li></ul>').getHTML())
    expect(html).not.toMatch(/<li>[^]*data-ph="meteringPoints"[^]*<\/li>/)
  })

  it("inline placeholders still go to the cursor", () => {
    const e = editor("<p>Hallo Welt</p>")
    e.commands.setTextSelection(7)
    insertPlaceholder(e, {key: "member.firstName", label: "Vorname", block: false})
    expect(toMailHtml(e.getHTML())).toBe('<p>Hallo <span data-ph="member.firstName">Vorname</span>Welt</p>')
  })
})

describe("applyLink", () => {
  it("inserts the address as linked text when nothing is selected", () => {
    const e = editor("<p>Info: </p>")
    e.commands.focus("end")
    applyLink(e, "https://eeg.example.at")
    applyLink(e, "mailto:office@eeg.example.at")
    expect(toMailHtml(e.getHTML())).toBe('<p>Info:<a href="https://eeg.example.at">https://eeg.example.at</a>' +
      '<a href="mailto:office@eeg.example.at">office@eeg.example.at</a></p>')
  })

  it("links the selected text and removes the link with an empty address", () => {
    const e = editor("<p>Webseite</p>")
    e.commands.selectAll()
    applyLink(e, "https://eeg.example.at")
    expect(toMailHtml(e.getHTML())).toBe('<p><a href="https://eeg.example.at">Webseite</a></p>')
    e.commands.setTextSelection(3)
    applyLink(e, "")
    expect(toMailHtml(e.getHTML())).toBe("<p>Webseite</p>")
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

describe("replaceContent", () => {
  it("is one undo step (taking over the new default can be undone)", () => {
    const e = editor("")
    setContentWithoutHistory(e, "<p>Eigene Fassung</p>")
    replaceContent(e, "<p>Neuer Standard</p>")
    expect(e.getHTML()).toBe("<p>Neuer Standard</p>")
    e.commands.undo()
    expect(e.getHTML()).toBe("<p>Eigene Fassung</p>")
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
    expect(toMailHtml('<img src="mailfile:0b5e0b5e-0b5e-4b5e-8b5e-0b5e0b5e0b5e" width="300" height="20" title="t">')).toBe('<img src="mailfile:0b5e0b5e-0b5e-4b5e-8b5e-0b5e0b5e0b5e" width="300">')
    expect(toMailHtml('<p style="font-size:13px">a</p><h2 style="FONT-SIZE: 20PX">b</h2><ul><li style="font-size:20px">c</li></ul>'))
      .toBe('<p style="font-size: 13px">a</p><h2 style="font-size: 20px">b</h2><ul><li style="font-size: 20px">c</li></ul>')
    expect(toMailHtml('<p style="font-size:20px;color:red;text-align:right">a</p>'))
      .toBe('<p style="text-align: right; font-size: 20px">a</p>')
    expect(toMailHtml('<p style="font-size:30px">a</p><p style="font-size:1em">b</p><p style="font-size:13pt;text-align:left">c</p>'))
      .toBe('<p>a</p><p>b</p><p style="text-align: left">c</p>')
    expect(toMailHtml('<blockquote style="font-size:20px">a</blockquote><a href="https://x.at" style="font-size:20px">b</a>'))
      .toBe('<blockquote>a</blockquote><a href="https://x.at">b</a>')
    expect(toMailHtml('<span style="font-size:20px">a</span><div style="font-size:13px">b</div>')).toBe("ab")
    // the last declaration counts, as in the browser
    expect(toMailHtml('<p style="font-size:30px; font-size:13px; text-align:left; text-align:center">a</p>'))
      .toBe('<p style="text-align: center; font-size: 13px">a</p>')
    expect(toMailHtml('<p style="font-size:13px; font-size:30px; text-align:right; text-align:justify">a</p>')).toBe("<p>a</p>")
  })

  it("extracts the file id from a mailfile reference", () => {
    expect(mailFileId("mailfile:0B5E0B5E-0B5E-4B5E-8B5E-0B5E0B5E0B5E")).toBe("0B5E0B5E-0B5E-4B5E-8B5E-0B5E0B5E0B5E")
    expect(mailFileId("mailfile:eegfaktura-logo")).toBe("eegfaktura-logo")
    expect(mailFileId("mailfile:abc")).toBeUndefined()
    expect(mailFileId("mailfile:../files/x")).toBeUndefined()
    expect(mailFileId("mailfile:0b5e0b5e-0b5e-4b5e-8b5e-0b5e0b5e0b5e?x=1")).toBeUndefined()
    expect(mailFileId("blob:abc")).toBeUndefined()
    expect(mailFileId(null)).toBeUndefined()
  })
})
