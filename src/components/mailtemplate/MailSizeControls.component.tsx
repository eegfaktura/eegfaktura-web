import React, {FC} from "react";
import {IonButton} from "@ionic/react";
import {Editor, useEditorState} from "@tiptap/react";
import {useLocale} from "../../store/hook/useLocale";
import {activeFontSize, FontSize, ImageSize, selectedImageSize, setFontSize, setImageSize} from "./mailEditor.sizes";

interface SizeControlsProps {
  editor: Editor
  disabled: boolean
}

const FONT_LABEL_SIZES: Record<FontSize, string> = {small: "0.75em", normal: "1em", large: "1.25em"}

// „Schriftgröße“ for the block(s) at the cursor; „Bildgröße“ only while an image is selected.
const MailSizeControls: FC<SizeControlsProps> = ({editor, disabled}) => {
  const {t} = useLocale("common")
  const state = useEditorState({
    editor,
    selector: ({editor: e}) => ({font: activeFontSize(e), image: e.isActive("image"), imageSize: selectedImageSize(e)})
  })
  const button = (key: string, label: React.ReactNode, active: boolean, run: () => void) => (
    <IonButton key={key} size="small" fill={active ? "solid" : "outline"} title={t(`mailtemplates.toolbar.${key}`)}
               aria-label={t(`mailtemplates.toolbar.${key}`)} disabled={disabled} onClick={run}>{label}</IonButton>
  )
  return (
    <>
      <span role="group" aria-label={t("mailtemplates.toolbar.font_size")} className="mail-editor-toolbar-group">
        {(["small", "normal", "large"] as FontSize[]).map(size =>
          button(`font_${size}`, <span style={{fontSize: FONT_LABEL_SIZES[size]}}>A</span>, state.font === size,
            () => setFontSize(editor, size)))}
      </span>
      {state.image &&
        <span role="group" aria-label={t("mailtemplates.toolbar.image_size")} className="mail-editor-toolbar-group">
          {(["small", "medium", "large"] as ImageSize[]).map(size =>
            button(`image_${size}`, t(`mailtemplates.toolbar.image_${size}_short`), state.imageSize === size,
              () => setImageSize(editor, size)))}
        </span>}
    </>
  )
}

export default MailSizeControls
