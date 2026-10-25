import React, {FC} from "react";
import {IonButton, IonText} from "@ionic/react";
import {MailTemplate, MailTemplateSource} from "../../models/mailtemplate.model";
import {useLocale} from "../../store/hook/useLocale";
import {statusText} from "./mailTemplate.util";

interface MailTemplateHeaderProps {
  template: MailTemplate
  source: MailTemplateSource
  busy: boolean
  loadError?: string
  conflict: boolean
  onViewDefault: () => void
  onApplyDefault: () => void
  onReloadAfterError: () => void
  onReloadAfterConflict: () => void
}

// Name, description and status of the mail, with the notices above the editor.
const MailTemplateHeader: FC<MailTemplateHeaderProps> = ({
                                                           template, source, busy, loadError, conflict, onViewDefault,
                                                           onApplyDefault, onReloadAfterError, onReloadAfterConflict
                                                         }) => {
  const {t} = useLocale("common")
  return (
    <>
      <div className="header">{template.name}</div>
      <p className="mail-template-description">{template.description}</p>
      <p className="mail-template-status">{statusText(t, template)}</p>
      {source === "billing" && <IonText color="medium"><p>{t("mailtemplates.billing_pdf_hint")}</p></IonText>}
      {template.legacyTemplateActive &&
        <IonText color="warning"><p className="mail-template-notice">{t("mailtemplates.legacy_active")}</p></IonText>}
      {template.defaultChanged && (
        <div className="mail-template-notice">
          <IonText color="warning"><p>{t("mailtemplates.default_changed")}</p></IonText>
          <IonButton size="small" fill="outline" disabled={busy} onClick={onViewDefault}>
            {t("mailtemplates.default_view")}
          </IonButton>
          <IonButton size="small" fill="outline" disabled={busy} onClick={onApplyDefault}>{t("mailtemplates.default_apply")}</IonButton>
        </div>
      )}
      {loadError && (
        <div className="mail-template-notice" role="alert">
          <IonText color="danger"><p>{t("mailtemplates.load_failed", {message: loadError})}</p></IonText>
          <IonButton size="small" disabled={busy} onClick={onReloadAfterError}>{t("mailtemplates.reload")}</IonButton>
        </div>
      )}
      {conflict && (
        <div className="mail-template-notice" role="alert">
          <IonText color="danger"><p>{t("mailtemplates.conflict")}</p></IonText>
          <IonButton size="small" disabled={busy} onClick={onReloadAfterConflict}>{t("mailtemplates.reload")}</IonButton>
        </div>
      )}
    </>
  )
}

export default MailTemplateHeader
