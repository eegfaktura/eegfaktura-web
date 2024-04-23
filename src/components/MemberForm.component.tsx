import React, {FC, useEffect, useState, ClipboardEvent} from "react";
import {IonCol, IonGrid, IonList, IonListHeader, IonRow} from "@ionic/react";
import {people} from "ionicons/icons";
import InputForm from "./form/InputForm.component";
import {useForm} from "react-hook-form";
import {EegParticipant} from "../models/members.model";
import {eegBusiness} from "../eegIcons";
import ToggleButtonComponent from "./ToggleButton.component";
import SelectForm from "./form/SelectForm.component";
import {EegTariff} from "../models/eeg.model";
import DatePickerCoreElement from "./core/elements/DatePickerCore.element";
import DatePickerFormElement from "./form/DatePickerForm.element";
import {IbanInputForm} from "./form/IbanInputForm";
import {PhoneInputForm} from "./form/PhoneInputForm";
import {useLocale} from "../store/hook/useLocale";

interface MemberFormComponentProps {
  participant: EegParticipant
  rates: EegTariff[]
  formId: string
  onSubmit: (data: EegParticipant) => void
  onSubmitPartial: (participantId: string, value: Record<string, any>) => void
  changeable?: boolean
}

const MemberFormComponent: FC<MemberFormComponentProps> = ({participant, rates, onSubmitPartial, changeable}) => {

  const {t} = useLocale("common")
  const [selectedBusinessType, setSelectedBusinessType] = useState(0)

  const { setValue, control,  reset, formState: {errors} } = useForm({
    defaultValues: participant, mode: "all"});

  const isChangeable = () => {
    if (changeable === undefined) {
      return true
    }
    return changeable
  }

  const onChangeBusinessType = (s: number) => {
    setSelectedBusinessType(s)
    setValue("businessRole", s === 0 ? "EEG_PRIVATE" : "EEG_BUSINESS")
  }

  useEffect(() => {
    if (participant) {
      participant.businessRole === 'EEG_PRIVATE' ? setSelectedBusinessType(0) : setSelectedBusinessType(1)
      reset(participant)
    }
  }, [participant])

  const getRatesOption = () => {
    const r =  rates.filter(r => r.type === "EEG").map((r) => {
      return {key: r.id, value: r.name}
    })
    return [{key: null, value: "Kein Tarif"}, ...r]
  }

  const onUpdateBaseData = (name: string, value: any) => {
    const nameHirachy = name.split(".")
    onSubmitPartial(participant.id, {[name]: value})
  }

  if (!participant) {
    return <></>
  }

  return (
    <>
      <IonGrid>
        <IonRow>
          <IonCol size="auto">
            <ToggleButtonComponent
              buttons={[{label: t("participant-title_privat"), icon: people}, {label: t("participant-title_company"), icon: eegBusiness}]}
              onChange={onChangeBusinessType}
              value={selectedBusinessType}
              changeable={isChangeable()}
            />
          </IonCol>
        </IonRow>
      </IonGrid>
      {/*<form onBlur={handleSubmit(onSubmit)}>*/}
        <IonList>
          <IonListHeader>Kontakt</IonListHeader>
          <InputForm name={"participantNumber"} label={t("participant-nr")} control={control} type="text" onChangePartial={onUpdateBaseData}/>
          {selectedBusinessType === 0 ? (
              <>
                <div style={{display: "grid", gridTemplateColumns: "50% 50%"}}>
                  <InputForm name={"titleBefore"} label={t("participant-title_before")} control={control} type="text" onChangePartial={onUpdateBaseData}/>
                  <InputForm name={"titleAfter"} label={t("participant-title_after")} control={control} type="text" onChangePartial={onUpdateBaseData}/>
                </div>
                <InputForm name={"firstname"} label={t("firstname")} control={control}
                           rules={{required: t("warnings.firstname_missing")}} type="text" error={errors.firstname} onChangePartial={onUpdateBaseData}/>
                <InputForm name={"lastname"} label={t("lastname")} control={control} rules={{required: t("warnings.lastname_missing")}}
                           type="text" error={errors.lastname} onChangePartial={onUpdateBaseData}/>
              </>
            ) :
            (
              <InputForm name={"firstname"} label={t("company-name")}  control={control}
                         rules={{required: t("company-name_missing")}} type="text" error={errors.firstname} onChangePartial={onUpdateBaseData}/>
            )
          }
          <SelectForm name={"tariffId"} label={t("participant_tariff")} control={control} options={getRatesOption()} onChangePartial={onUpdateBaseData}/>
          <InputForm name={"billingAddress.street"} label={t("street")} control={control} rules={{required: "Straße fehlt"}} type="text" error={errors.residentAddress?.street} onChangePartial={onUpdateBaseData}/>
          <InputForm name={"billingAddress.streetNumber"} label="Hausnummer" control={control} type="text" onChangePartial={onUpdateBaseData}/>
          <InputForm name={"billingAddress.zip"} label={t("zip")} control={control} type="text" onChangePartial={onUpdateBaseData}/>
          <InputForm name={"billingAddress.city"} label={t("city")} control={control} type="text" onChangePartial={onUpdateBaseData}/>
          <PhoneInputForm name={"contact.phone"} control={control} setValue={setValue} onChangePartial={onUpdateBaseData} error={errors.contact?.phone}/>
          <InputForm name={"contact.email"} label={t("email")} control={control} rules={{
            required: t("warnings.email", {context: "missing"}),
            pattern: {
              value: /^([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4};*)+$/i,
              message: t("warnings.email", {context: "wrong"})}
          }} isEmail={true} multiple={true} error={errors.contact?.email} onChangePartial={onUpdateBaseData}/>
          <InputForm name={"vatNumber"} label={t("uid")}control={control} type="text" onChangePartial={onUpdateBaseData}/>
        </IonList>
      {/*</form>*/}
        <IonList>
          <IonListHeader>Bankdaten</IonListHeader>
          <IbanInputForm name={"accountInfo.iban"} control={control} onChangePartial={onUpdateBaseData} error={errors.accountInfo?.iban}/>
          <InputForm name={"accountInfo.owner"} label={t("account-owner")} control={control} type="text" onChangePartial={onUpdateBaseData}/>
        </IonList>

        <IonList>
          <IonListHeader>Optionals</IonListHeader>
          <DatePickerCoreElement initialValue={participant.participantSince} name={"participantSince"} label={t("participant-since")}
                                 placeholder={t("date")} onChange={onUpdateBaseData}/>
          {/*<InputForm name={"participantSince"} label="Mitglied seit" control={control} type="text"/>*/}
        </IonList>
    </>
  )
}

export default MemberFormComponent;