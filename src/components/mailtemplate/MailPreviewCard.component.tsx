import React, {FC} from "react";
import {IonButton, IonCard, IonLabel} from "@ionic/react";
import {MailPreview} from "../../models/mailtemplate.model";
import {useLocale} from "../../store/hook/useLocale";

interface MailPreviewCardProps {
  preview: MailPreview
  onClose: () => void
}

const MailPreviewCard: FC<MailPreviewCardProps> = ({preview, onClose}) => {
  const {t} = useLocale("common")
  return (
    <IonCard className="mail-template-preview">
      <div className="mail-template-preview-header">
        <IonLabel>{t("mailtemplates.preview_title")}</IonLabel>
        <IonButton size="small" fill="clear" onClick={onClose}>{t("mailtemplates.preview_close")}</IonButton>
      </div>
      <p><strong>{t("mailtemplates.subject")}:</strong> {preview.subject}</p>
      {/* sandbox without allow-scripts / allow-same-origin: the rendered mail cannot run code or reach the app */}
      <iframe title={t("mailtemplates.preview_title")} sandbox="" srcDoc={preview.html}/>
    </IonCard>
  )
}

export default MailPreviewCard
