import {afterEach, describe, expect, it} from "vitest";
import {Editor} from "@tiptap/core";
import {mailEditorExtensions, toMailHtml} from "../../../components/mailtemplate/mailEditor.extensions";
import {insertUploadedImage} from "../../../components/mailtemplate/mailImagePaste";

const editors: Editor[] = []
afterEach(() => { editors.splice(0).forEach(e => e.destroy()) })

describe("a new image in the mail editor (users' request 2026-10-28)", () => {
  it("starts in the small size, 200 px", () => {
    const e = new Editor({extensions: mailEditorExtensions(id => Promise.resolve(`blob:test/${id}`)), content: "<p>Hallo</p>"})
    editors.push(e)
    insertUploadedImage(e as any, {src: "mailfile:3f2504e0-4f89-11d3-9a0c-0305e82c3301", alt: "Logo"})
    expect(toMailHtml(e.getHTML())).toContain('width="200"')
  })
})
