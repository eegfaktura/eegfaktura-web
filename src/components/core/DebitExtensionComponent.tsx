import React, {FC, useEffect, useMemo, useRef} from "react";
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
import {useAppSelector} from "../../store";
import {allParticipantsSelector} from "../../store/participant";


export const DebitExtensionComponent: FC<{
  onUpdateBaseData?: (name: string, value: any) => void | Promise<unknown>
}> = ({onUpdateBaseData}) => {
  const {t} = useLocale("common")
  const {control, watch, setValue, getValues, trigger, formState: {errors}} = useFormContext<EegParticipant>();

  const sepaMode = watch("accountInfo.sepaDirectDebit")
  const participantNumber = watch("participantNumber")
  const debit = isDirectDebit(sepaMode)

  // mandate references the other members of this community already use (unique per creditor id)
  const participants = useAppSelector(allParticipantsSelector)
  const ownId = watch("id")
  const takenReferences = useMemo(() => new Set(participants
    .filter(p => p.id !== ownId)
    .map(p => (p.accountInfo?.mandateReference ?? "").trim().toUpperCase())
    .filter(r => r !== "")), [participants, ownId])

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
    const next = suggestMandateReference(getValues("accountInfo.mandateReference"), participantNumber, lastSuggestion.current, takenReferences)
    if (next !== undefined) {
      setValue("accountInfo.mandateReference", next)
      lastSuggestion.current = next === "" ? undefined : next
    }
  }, [participantNumber, debit, takenReferences])

  // Existing member: switching to CORE/B2B fills an empty mandate reference once and saves it.
  const onChangeDebitType = (name: string, value: any) => {
    // the IBAN and the mandate date become required (or optional): show their state once the
    // saves are answered — each answer carries the whole member and resets the form and its errors
    const revalidate = () => setTimeout(() => trigger(["accountInfo.iban", "accountInfo.mandateDate"]))
    if (!onUpdateBaseData) {
      revalidate()
      return
    }
    const saved = Promise.resolve(onUpdateBaseData(name, value))
    const next = isDirectDebit(value)
      ? suggestMandateReference(getValues("accountInfo.mandateReference"), getValues("participantNumber"), undefined, takenReferences)
      : undefined
    // existing member: only fill an empty reference, never clear one
    if (next === undefined || next === "") {
      saved.then(revalidate)
      return
    }
    setValue("accountInfo.mandateReference", next)
    // only after the debit type is saved (false: the save failed, nothing more is written)
    saved
      .then(ok => ok === false ? undefined : onUpdateBaseData("accountInfo.mandateReference", next))
      .then(revalidate)
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