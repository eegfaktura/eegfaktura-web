import React, {FC} from "react";
import SelectForm from "../form/SelectForm.component";
import InputForm from "../form/InputForm.component";
import DatePickerCoreElement from "./elements/DatePickerCore.element";
import {SepaDirectDebitType} from "../../models/eeg.model";
import {Control, useFormContext} from "react-hook-form";
import {useLocale} from "../../store/hook/useLocale";
import DatePickerFormElement from "../form/DatePickerForm.element";
import {EegParticipant} from "../../models/members.model";
import DatePickerInput from "../form/NewDatePickerForm.component";


export const DebitExtensionComponent: FC<{
  onUpdateBaseData?: (name: string, value: any) => void
}> = ({onUpdateBaseData}) => {
  const {t} = useLocale("common")
  const {control, watch, formState: {errors}} = useFormContext<EegParticipant>();

  const sepaMode = watch("accountInfo.sepaDirectDebit")

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
                  options={getDebitOptions()} onChangePartial={onUpdateBaseData}/>
      {sepaMode !== 'NONE' &&
          <>
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
                               onChangePartial={onUpdateBaseData
                                 ? (date: Date | null) => onUpdateBaseData("accountInfo.mandateDate", date)
                                 : undefined}/>
          </>
      }
    </>
  )
}