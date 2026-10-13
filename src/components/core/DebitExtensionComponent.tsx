import React, {FC, useEffect, useRef} from "react";
import SelectForm from "../form/SelectForm.component";
import InputForm from "../form/InputForm.component";
import DatePickerCoreElement from "./elements/DatePickerCore.element";
import {SepaDirectDebitType} from "../../models/eeg.model";
import {Control, useFormContext} from "react-hook-form";
import {useLocale} from "../../store/hook/useLocale";
import DatePickerFormElement from "../form/DatePickerForm.element";
import {EegParticipant} from "../../models/members.model";
import DatePickerInput from "../form/NewDatePickerForm.component";
import {isDirectDebit, suggestMandateReference} from "../../util/MandateReference.util";


export const DebitExtensionComponent: FC<{
  onUpdateBaseData?: (name: string, value: any) => void | Promise<unknown>
}> = ({onUpdateBaseData}) => {
  const {t} = useLocale("common")
  const {control, watch, setValue, getValues, trigger, formState: {errors}} = useFormContext<EegParticipant>();

  const sepaMode = watch("accountInfo.sepaDirectDebit")
  const participantNumber = watch("participantNumber")
  const debit = isDirectDebit(sepaMode)

  // New member (no partial save): the mandate reference follows the member number while the
  // field is empty or still holds the last suggestion (platform#143).
  const lastSuggestion = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (onUpdateBaseData) return
    if (!debit) {
      // "Kein SEPA": an untouched suggestion must not be saved as mandate reference
      if (lastSuggestion.current !== undefined && getValues("accountInfo.mandateReference") === lastSuggestion.current) {
        setValue("accountInfo.mandateReference", "")
      }
      lastSuggestion.current = undefined
      return
    }
    const next = suggestMandateReference(getValues("accountInfo.mandateReference"), participantNumber, lastSuggestion.current)
    if (next !== undefined) {
      setValue("accountInfo.mandateReference", next)
      lastSuggestion.current = next
    }
  }, [participantNumber, debit])

  // Existing member: switching to CORE/B2B fills an empty mandate reference once and saves it.
  const onChangeDebitType = (name: string, value: any) => {
    const saved = Promise.resolve(onUpdateBaseData?.(name, value))
    // the IBAN becomes required (or optional): show its state right away, not only on the next edit
    setTimeout(() => trigger(["accountInfo.iban", "accountInfo.mandateDate"]))
    if (!onUpdateBaseData || !isDirectDebit(value)) return
    const next = suggestMandateReference(getValues("accountInfo.mandateReference"), getValues("participantNumber"))
    if (next !== undefined) {
      setValue("accountInfo.mandateReference", next)
      // after the debit type is saved: each save answers with the whole member and resets the form,
      // so a later-arriving debit-type answer would otherwise show the reference empty again
      saved.then(() => onUpdateBaseData("accountInfo.mandateReference", next))
    }
  }

  const getDebitOptions = () => {
    return [
      {key: "NONE", value: t("account.sepaDebitOption_none")},
      {key: "B2B", value: t("account.sepaDebitOption_b2b")},
      {key: "CORE", value: t("account.sepaDebitOption_core")},
    ]
  }

  return (
    <>
      <SelectForm name={"accountInfo.sepaDirectDebit"} label={t("account.sepaDirectDebit")} control={control}
                  options={getDebitOptions()} onChangePartial={onChangeDebitType}/>
      {debit &&
          <>
              <div style={{padding: "0 16px 6px", fontSize: "12px", color: "var(--ion-color-medium)"}}>
                {t("account.mandate-hint")}
              </div>
              <InputForm name={"accountInfo.bankName"} label={t("account.name")} control={control} type="text"
                         rules={{required: t("warnings.account-name_missing")}} error={errors.accountInfo?.bankName}
                         onChangePartial={onUpdateBaseData}/>
              <InputForm name={"accountInfo.mandateReference"} label={t("account.mandate-reference")} control={control}
                         type="text" onChangePartial={onUpdateBaseData}
                         rules={{required: t("warnings.account-mandate_reference_missing")}} error={errors.accountInfo?.mandateReference}/>
              {/*<DatePickerFormElement name={"accountInfo.mandateDate"} label={t("account.mandate-date")}*/}
              {/*                       control={control} onChangeDate={onUpdateBaseData}*/}
              {/*                       rules={{required: true}} error={errors.accountInfo?.mandateDate} />*/}

              <DatePickerInput name={"accountInfo.mandateDate"} label={t("account.mandate-date")}
                               control={control}
                               rules={{required: t("warnings.account-mandate_date_missing")}}
                               onChangePartial={onUpdateBaseData
                                 ? (date: Date | null) => onUpdateBaseData("accountInfo.mandateDate", date)
                                 : undefined}/>
          </>
      }
    </>
  )
}