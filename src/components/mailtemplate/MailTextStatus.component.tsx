import React, {FC} from "react";
import {IonToggle} from "@ionic/react";
import {MailTemplate} from "../../models/mailtemplate.model";
import {useLocale} from "../../store/hook/useLocale";
import {savedText} from "./mailTemplate.util";

interface MailTextStatusProps {
  template: MailTemplate
  ownText: boolean
  disabled: boolean
  onSwitch: (on: boolean) => void
}

// The switch „Eigenen Text verwenden“ and the box saying which text the members get.
const MailTextStatus: FC<MailTextStatusProps> = ({template, ownText, disabled, onSwitch}) => {
  const {t} = useLocale("common")
  return (
    <div className="mail-text-status">
      <IonToggle checked={ownText} disabled={disabled} justify="start" labelPlacement="end"
                 onIonChange={e => onSwitch(e.detail.checked)}>{t("mailtemplates.own_text_toggle")}</IonToggle>
      <div role="status" className={`mail-template-status-box ${template.customized ? "own" : "standard"}`}>
        {template.customized
          ? <p>{savedText(t, template, "status_own")}</p>
          : <>
            <p>{t("mailtemplates.status_standard")}</p>
            {ownText && <p>{t("mailtemplates.status_not_saved")}</p>}
          </>}
      </div>
    </div>
  )
}

export default MailTextStatus
