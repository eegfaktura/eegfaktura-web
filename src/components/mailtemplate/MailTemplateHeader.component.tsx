import React, {FC} from "react";
import {IonButton, IonText} from "@ionic/react";
import {MailTemplate, MailTemplateSource} from "../../models/mailtemplate.model";
import {useLocale} from "../../store/hook/useLocale";
import MailTextStatus from "./MailTextStatus.component";

interface MailTemplateHeaderProps {
  template: MailTemplate
  source: MailTemplateSource
  busy: boolean
  loadError?: string
  conflict: boolean
  ownText: boolean
  // remounts the switch (see useOwnTextSwitch)
  switchKey: number
  onSwitch: (on: boolean) => void
  onViewDefault: () => void
  onApplyDefault: () => void
  onReloadAfterError: () => void
  onReloadAfterConflict: () => void
}

// Name, description, the switch with the status of the mail, and the notices above the editor.
const MailTemplateHeader: FC<MailTemplateHeaderProps> = ({
                                                           template, source, busy, loadError, conflict, ownText,
                                                           switchKey, onSwitch, onViewDefault,
                                                           onApplyDefault, onReloadAfterError, onReloadAfterConflict
                                                         }) => {
  const {t} = useLocale("common")
  return (
    <>
      <div className="header">{template.name}</div>
      <p className="mail-template-description">{template.description}</p>
      <MailTextStatus key={switchKey} template={template} ownText={ownText} disabled={busy} onSwitch={onSwitch}/>
      {source === "billing" && <IonText color="medium"><p>{t("mailtemplates.billing_pdf_hint")}</p></IonText>}
      {template.customized && template.defaultChanged && (
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
