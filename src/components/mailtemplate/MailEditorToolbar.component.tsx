import React, {FC} from "react";
import {IonButton, IonIcon} from "@ionic/react";
import {imageOutline, linkOutline, listOutline} from "ionicons/icons";
import {Editor, useEditorState} from "@tiptap/react";
import {useLocale} from "../../store/hook/useLocale";

interface ToolbarProps {
  editor: Editor
  onLink: () => void
  onImage: () => void
  imageDisabled: boolean
}

const MailEditorToolbar: FC<ToolbarProps> = ({editor, onLink, onImage, imageDisabled}) => {
  const {t} = useLocale("common")
  const state = useEditorState({
    editor,
    selector: ({editor: e}) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h1: e.isActive("heading", {level: 1}),
      h2: e.isActive("heading", {level: 2}),
      h3: e.isActive("heading", {level: 3}),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      link: e.isActive("link"),
      left: e.isActive({textAlign: "left"}),
      center: e.isActive({textAlign: "center"}),
      right: e.isActive({textAlign: "right"}),
    })
  })
  const chain = () => editor.chain().focus()
  const button = (key: string, label: React.ReactNode, active: boolean, run: () => void, disabled = false) => (
    <IonButton key={key} size="small" fill={active ? "solid" : "outline"} title={t(`mailtemplates.toolbar.${key}`)}
               aria-label={t(`mailtemplates.toolbar.${key}`)} disabled={disabled} onClick={run}>{label}</IonButton>
  )
  return (
    <div className="mail-editor-toolbar">
      {button("bold", <strong>B</strong>, state.bold, () => chain().toggleBold().run())}
      {button("italic", <em>I</em>, state.italic, () => chain().toggleItalic().run())}
      {button("underline", <u>U</u>, state.underline, () => chain().toggleUnderline().run())}
      {button("h1", "H1", state.h1, () => chain().toggleHeading({level: 1}).run())}
      {button("h2", "H2", state.h2, () => chain().toggleHeading({level: 2}).run())}
      {button("h3", "H3", state.h3, () => chain().toggleHeading({level: 3}).run())}
      {button("bullet_list", <IonIcon icon={listOutline}/>, state.bulletList, () => chain().toggleBulletList().run())}
      {button("ordered_list", "1.", state.orderedList, () => chain().toggleOrderedList().run())}
      {button("link", <IonIcon icon={linkOutline}/>, state.link, onLink)}
      {button("align_left", "⇤", state.left, () => chain().setTextAlign("left").run())}
      {button("align_center", "↔", state.center, () => chain().setTextAlign("center").run())}
      {button("align_right", "⇥", state.right, () => chain().setTextAlign("right").run())}
      {button("image", <IonIcon icon={imageOutline}/>, false, onImage, imageDisabled)}
    </div>
  )
}

export default MailEditorToolbar
