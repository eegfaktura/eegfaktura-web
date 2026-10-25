import React, {FC} from "react";
import {IonSelect, IonSelectOption} from "@ionic/react";
import {MailPlaceholder} from "../../models/mailtemplate.model";
import {useLocale} from "../../store/hook/useLocale";

interface MailPlaceholderPickerProps {
  // "subject": inline placeholders only; "body": all, block placeholders marked
  target: "subject" | "body"
  placeholders: MailPlaceholder[]
  onPick: (ph: MailPlaceholder) => void
}

// The caller remounts the picker (key) after each insert, so the same placeholder can be chosen again.
const MailPlaceholderPicker: FC<MailPlaceholderPickerProps> = ({target, placeholders, onPick}) => {
  const {t} = useLocale("common")
  const label = t(target === "subject" ? "mailtemplates.placeholder_insert_subject" : "mailtemplates.placeholder_insert")
  const options = target === "subject" ? placeholders.filter(p => !p.block) : placeholders
  return (
    <IonSelect interface="popover" data-testid={`${target}-placeholder`} placeholder={label} value={null}
               aria-label={label}
               onIonChange={e => {
                 const ph = options.find(p => p.key === e.detail.value)
                 if (ph) onPick(ph)
               }}>
      {options.map(p => (
        <IonSelectOption key={p.key} value={p.key}>
          {p.block ? `${p.label} (${t("mailtemplates.placeholder_block")})` : p.label}
        </IonSelectOption>
      ))}
    </IonSelect>
  )
}

export default MailPlaceholderPicker
