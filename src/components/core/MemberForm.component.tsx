import React, {FC, useEffect, useState, ClipboardEvent} from "react";
import {IonButton, IonCol, IonGrid, IonIcon, IonList, IonListHeader, IonRow, useIonAlert} from "@ionic/react";
import {people, swapHorizontalSharp} from "ionicons/icons";
import InputForm from "../form/InputForm.component";
import {FormProvider, useForm} from "react-hook-form";
import {EegParticipant} from "../../models/members.model";
import {eegBusiness} from "../../eegIcons";
import ToggleButtonComponent from "../ToggleButton.component";
import SelectForm from "../form/SelectForm.component";
import {EegTariff} from "../../models/eeg.model";
import DatePickerCoreElement from "./elements/DatePickerCore.element";
import {IbanInputForm} from "../form/IbanInputForm";
import {PhoneInputForm} from "../form/PhoneInputForm";
import {useLocale} from "../../store/hook/useLocale";
import {useAccessGroups} from "../../store/hook/Eeg.provider";
import {usePersistBusinessTypeMutation} from "../../store/participant/api";
import DatePickerFormElement from "../form/DatePickerForm.element";
import {DebitExtensionComponent} from "./DebitExtensionComponent";
import DatePickerInput from "../form/NewDatePickerForm.component";
import {Moment} from "moment";
import {LocalDate} from "local-date";

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
  const {isAdmin} = useAccessGroups()
  const [presentAlert] = useIonAlert();

  const [selectedBusinessType, setSelectedBusinessType] = useState(0)

  const [persistBusinessType] = usePersistBusinessTypeMutation()

  const formMethods = useForm({
    defaultValues: participant, mode: "all"})

  const { setValue, control, watch, reset, formState: {errors} } = formMethods;

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

  const getDebitOptions = () => {
    return [{key: "NONE", value: t("account.sepaDebitOption_none")}, {key: "B2B", value: t("account.sepaDebitOption_b2b")}, {key: "CORE", value: t("account.sepaDebitOption_core")}]
  }

  const sepaMode = watch ? watch("accountInfo.sepaDirectDebit") : "NONE"

  const onUpdateBaseData = (name: string, value: any) => {
    onSubmitPartial(participant.id, {[name]: value})
  }

  if (!participant) {
    return <></>
  }

  const askFor = (msg: string, okHandler: () => void, cancelHandler?: () => void) => {
    presentAlert(msg, [{text: t("button_labels.cancel"), handler: cancelHandler}, {text: t("button_labels.ok"), handler: okHandler}])
  }

  return (
    <FormProvider {...formMethods}>
      <IonGrid>
        <IonRow class="ion-justify-content-between">
          <IonCol size="auto">
            <ToggleButtonComponent
              buttons={[{label: t("participant-title_privat"), icon: people}, {label: t("participant-title_company"), icon: eegBusiness}]}
              onChange={onChangeBusinessType}
              value={selectedBusinessType}
              changeable={isChangeable()}
            />
          </IonCol>
          {isAdmin() && !isChangeable() &&
              <IonCol size="auto">
                  <div>
                      <IonButton size="small" fill="clear" onClick={() => {
                        askFor(t("alerts.changeBusinessType", { context: ''+selectedBusinessType }),
                          () => {
                            onChangeBusinessType(selectedBusinessType === 0 ? 1 : 0)
                            persistBusinessType({participantId: participant.id, value: {path: 'businessRole',
                                value: selectedBusinessType === 0 ? "EEG_BUSINESS" : "EEG_PRIVATE"}})
                          });
                      }}>
                          <IonIcon slot="icon-only" icon={swapHorizontalSharp} size="small"></IonIcon>
                      </IonButton>
                  </div>
              </IonCol>}
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
              value: /^(?:[A-Z0-9\._%\+-]+@[A-Z0-9-]+\.[A-Z\.]{2,})(?:;[A-Z0-9\._%\+-]+@[A-Z0-9-]+\.[A-Z\.]{2,}){0,}$/i,
              message: t("warnings.email", {context: "wrong"})}
          }} isEmail={true} multiple={true} error={errors.contact?.email} onChangePartial={onUpdateBaseData}/>
          <InputForm name={"vatNumber"} label={t("uid")}control={control} type="text" onChangePartial={onUpdateBaseData}/>
        </IonList>
      {/*</form>*/}
        <IonList>
          <IonListHeader>Bankdaten</IonListHeader>
          <IbanInputForm name={"accountInfo.iban"} control={control} onChangePartial={onUpdateBaseData} error={errors.accountInfo?.iban}/>
          <InputForm name={"accountInfo.owner"} label={t("account.owner")} control={control} type="text" onChangePartial={onUpdateBaseData}/>

          <DebitExtensionComponent onUpdateBaseData={onUpdateBaseData}/>

          {/*<SelectForm name={"accountInfo.sepaDirectDebit"} label={t("account.sepaDirectDebit")} control={control} options={getDebitOptions()} onChangePartial={onUpdateBaseData}/>*/}
          {/*{sepaMode !== 'NONE' &&*/}
          {/*    <>*/}
          {/*        <InputForm name={"accountInfo.bankName"} label={t("account.name")} control={control} type="text" onChangePartial={onUpdateBaseData}/>*/}
          {/*        <InputForm name={"accountInfo.mandateReference"} label={t("account.mandate-reference")} control={control} type="text" onChangePartial={onUpdateBaseData}/>*/}
          {/*        <DatePickerCoreElement name={"accountInfo.mandateDate"} label={t("account.mandate-date")}*/}
          {/*                               initialValue={participant.accountInfo.mandateDate} onChange={onUpdateBaseData}/>*/}
          {/*    </>*/}
          {/*}*/}
        </IonList>

        <IonList>
          <IonListHeader>Optionals</IonListHeader>
          {/*<DatePickerCoreElement initialValue={participant.participantSince} name={"participantSince"} label={t("participant-since")}*/}
          {/*                       placeholder={t("date")} onChange={onUpdateBaseData}/>*/}
          <DatePickerInput name={"participantSince"} label={t("participant-since")}
                           control={control}
                           onChangePartial={onUpdateBaseData
                             ? (date: LocalDate | null) => onUpdateBaseData("participantSince", date)
                             : undefined}/>
          {/*<InputForm name={"participantSince"} label="Mitglied seit" control={control} type="text"/>*/}
        </IonList>
    </FormProvider>
  )
}

export default MemberFormComponent;