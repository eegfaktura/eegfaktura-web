import React, {FC} from "react";
import {IonButton, IonChip, IonIcon, IonLabel, IonText} from "@ionic/react";
import {attachOutline, closeCircleOutline, documentOutline, imageOutline} from "ionicons/icons";
import {MailFile, MailTemplateLimits} from "../../models/mailtemplate.model";
import {useLocale} from "../../store/hook/useLocale";
import {formatBytes} from "./mailTemplate.util";

interface MailFileListProps {
  images: MailFile[]
  attachments: MailFile[]
  totalBytes: number
  limits?: MailTemplateLimits
  usedImageIds: string[]
  attachmentId: string | null
  busy: boolean
  onAttach: (f: MailFile) => void
  onRemove: (f: MailFile) => void
  onAddPdf: () => void
}

// The limits, the images and the PDF attachment of the mail, each file as a chip with its state.
const MailFileList: FC<MailFileListProps> = ({
                                               images, attachments, totalBytes, limits, usedImageIds,
                                               attachmentId, busy, onAttach, onRemove, onAddPdf
                                             }) => {
  const {t} = useLocale("common")

  const fileState = (f: MailFile) => [
    t(f.committed ? "mailtemplates.file_saved" : "mailtemplates.file_draft"),
    f.kind === "image" && !usedImageIds.includes(f.id) ? t("mailtemplates.file_not_in_text") : undefined,
    f.kind === "attachment" && attachmentId !== f.id ? t("mailtemplates.file_not_attached") : undefined,
  ].filter(Boolean).join(", ")

  const fileChip = (f: MailFile) => (
    <IonChip key={f.id}>
      <IonIcon icon={f.kind === "image" ? imageOutline : documentOutline}/>
      <IonLabel>{f.filename} ({formatBytes(f.size)}) – {fileState(f)}</IonLabel>
      {f.kind === "attachment" && attachmentId !== f.id &&
        // e.g. a fresh draft of another session: attach it instead of deleting it
        <IonIcon icon={attachOutline} aria-label={t("mailtemplates.file_attach", {name: f.filename})}
                 title={t("mailtemplates.file_attach", {name: f.filename})}
                 onClick={() => !busy && onAttach(f)}/>}
      <IonIcon icon={closeCircleOutline} aria-label={t("mailtemplates.file_remove", {name: f.filename})}
               onClick={() => !busy && onRemove(f)}/>
    </IonChip>
  )

  return (
    <>
      {limits && <div className="mail-template-limits">
        <IonText color="medium">
          <p>{t("mailtemplates.limits_images", {count: images.length, max: limits.maxImages, size: formatBytes(limits.maxImageBytes)})}</p>
          {limits.maxAttachments > 0 &&
            <p>{t("mailtemplates.limits_attachment", {max: limits.maxAttachments, size: formatBytes(limits.maxAttachmentBytes)})}</p>}
          <p>{t("mailtemplates.limits_total", {total: formatBytes(totalBytes), max: formatBytes(limits.maxTotalBytes)})}</p>
        </IonText>
      </div>}

      {images.length > 0 && (
        <div className="mail-template-attachments">
          <IonLabel>{t("mailtemplates.images")}</IonLabel>
          {images.map(fileChip)}
        </div>
      )}

      {limits && limits.maxAttachments > 0 && (
        <div className="mail-template-attachments">
          <IonLabel>{t("mailtemplates.attachment")}</IonLabel>
          {attachments.map(fileChip)}
          <IonButton size="small" fill="outline" disabled={busy || attachments.length >= limits.maxAttachments}
                     onClick={onAddPdf}>{t("mailtemplates.attachment_add")}</IonButton>
        </div>
      )}
    </>
  )
}

export default MailFileList
