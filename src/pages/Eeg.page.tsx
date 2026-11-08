import React, {FC, useContext, useEffect, useRef, useState} from "react";
import {
  IonButton,
  IonCard,
  IonContent,
  IonInput,
  IonModal,
  IonPage,
  useIonToast
} from "@ionic/react";
import InputFormComponent from "../components/form/InputForm.component";
import {useAppDispatch, useAppSelector} from "../store";
import {eegChanged, eegSelector, selectedTenant, selectTenant, updateEegModel} from "../store/eeg";
import {useForm} from "react-hook-form";
import SelectForm from "../components/form/SelectForm.component";

import "./Eeg.page.scss"
import {useAccessGroups, useHasBilling, useTenant} from "../store/hook/Eeg.provider";
import {areaLabel, zoneLevelLabel} from "../util/Area.util";
import EegBillingConfigCardComponent from "../components/EegBillingConfigCard.component";
import {AccountInfo, Address, Contact, Eeg, Optionals, SettlementIntervalResult} from "../models/eeg.model";
import {IbanInputForm} from "../components/form/IbanInputForm";
import {PhoneInputForm} from "../components/form/PhoneInputForm";
import {useLocale} from "../store/hook/useLocale";
import {isValidEmailList} from "../util/EmailAddress.util";
import EegLoadStateComponent from "../components/EegLoadState.component";
import MenuHeaderComponent from "../components/core/MenuHeader.component";
import SettlementIntervalChangeDialog from "../components/dialogs/SettlementIntervalChange.dialog";
import {afterIntervalChange, SETTLEMENT_INTERVALS} from "../util/SettlementInterval.util";
import {setSelectedPeriod} from "../store/energy";


const EMPTY_EEG_ENTITY = {
  communityId: "", rcNumber: "", name: "",
  legal: "", salesTax: "", taxNumber: "", vatNumber: "",
  businessNr: "", settlement: "", description: "", gridOperator: "", operatorName: "",
  settlementInterval: 'MONTHLY', allocationMode: "DYNAMIC", area: "LOCAL", contactPerson: "",
  address: {city: "", type: "BILLING", street: "", streetNumber: "", zip: ""} as Address,
  contact: {email: "", phone: ""} as Contact,
  accountInfo: {bankName: "", iban: "", owner: "", sepa: false} as AccountInfo,
  optionals: {website: ""} as Optionals,
  online: false,
} as Eeg

const EegPage: FC = () => {

  const {t} = useLocale("common")
  const eeg = useAppSelector(eegSelector);
  const {tenant} = useTenant()
  const dispatcher = useAppDispatch();

  const {isAdmin} = useAccessGroups()
  const billing = useHasBilling()
  // another community drops unsaved input ("add metering point", details, tariff editor): ask first (platform#228 step 4)

  const {handleSubmit, setValue, reset, control, formState: {errors, isDirty, dirtyFields}} =
    useForm({
      defaultValues: eeg,
      values: eeg,
      mode: "all",
    })
  // the interval chosen in the select, open in the change dialog (platform#230)
  const [pendingInterval, setPendingInterval] = useState<Eeg["settlementInterval"]>()
  // no closing by backdrop or Escape while the change is saved: its result must be seen
  const [savingInterval, setSavingInterval] = useState(false)
  const [toaster] = useIonToast()
  // the latest EEG for the dialog's dismiss handler, which may run after the store has the changed EEG
  const eegRef = useRef(eeg)
  eegRef.current = eeg

  useEffect(() => {
    if (!eeg) {
      reset(EMPTY_EEG_ENTITY, {keepDefaultValues: true})
    } else {
      reset(eeg)
    }
  }, [eeg]);

  const onChangeField = (mapper: string) => (name: string, value: any) => {
    dispatcher(updateEegModel({
      tenant, eeg: {[mapper]: value}
    }))
  }

  // platform#230: choosing an interval opens the change dialog, the generic save does not take it
  // (onChangePartial, not onIonChange: the form keeps the choice, so a cancel can set the stored value back)
  const onChangeInterval = (name: string, value: Eeg["settlementInterval"]) => {
    if (value && value !== eegRef.current?.settlementInterval) setPendingInterval(value)
  }

  const onIntervalDone = (result?: SettlementIntervalResult) => {
    setPendingInterval(undefined)
    setSavingInterval(false)
    if (result?.eeg) {
      dispatcher(eegChanged({tenant, eeg: result.eeg}))
      const {period, message} = afterIntervalChange(result)
      dispatcher(setSelectedPeriod(period))
      toaster({message, duration: 5000, position: "bottom"})
    } else {
      // cancelled: the select shows the stored interval again
      setValue("settlementInterval", eegRef.current?.settlementInterval ?? "MONTHLY")
    }
  }

  if (!eeg) {
    // the same IonPage as below (platform#237, see EegLoadState)
    return <IonPage><EegLoadStateComponent/></IonPage>
  }

  return (
    <IonPage>
      <MenuHeaderComponent/>
      <IonContent fullscreen>
        <div style={{flexGrow: "1", background: "#EAE7D9"}}>
          <div style={{display: "flex", flexDirection: "row"}}>

            <div style={{display: "flex", flexDirection: "column", flexGrow: "1"}}>
              <div className={"eeg-property-card"}>
                <div className={"header"}>{t("common-info.header")}</div>
                <IonCard color="eeglight">
                  {/* first in „Allgemeines“ (platform#245); the settlement interval is a billing setting: none without billing (platform#229) */}
                  {billing && <>
                  <SelectForm label={"Abrechnungsintervall"} placeholder={"Abrechnungsintervall"} control={control}
                              name={"settlementInterval"} options={SETTLEMENT_INTERVALS}
                              onChangePartial={onChangeInterval} disabled={!isAdmin()}></SelectForm>
                  <IonModal isOpen={!!pendingInterval} backdropDismiss={!savingInterval} onDidDismiss={() => pendingInterval && onIntervalDone()}>
                    {pendingInterval && tenant &&
                      <SettlementIntervalChangeDialog tenant={tenant} current={eeg.settlementInterval}
                                                      next={pendingInterval} onDone={onIntervalDone}
                                                      onSaving={setSavingInterval}/>}
                  </IonModal>
                  </>}

                  <InputFormComponent name={"rcNumber"} label={t("common-info.ec-number")} control={control} rules={{}} type="text"
                                      readonly={true}/>
                  <InputFormComponent name={"communityId"} label={t("common-info.community-id")} control={control} rules={{}}
                                      type="text"
                                      readonly={true}/>
                  <SelectForm name={"legal"} label={t("common-info.legal.label")} control={control} options={[
                    {key: "verein", value: t("common-info.legal.verein")},
                    {key: "genossenschaft", value: t("common-info.legal.genossenschaft")},
                    {key: "gesellschaft", value: t("common-info.legal.gesellschaft")}]}
                              placeholder={t("common-info.legal.placeholder")} disabled={!isAdmin()}/>
                  <InputFormComponent name={"description"} label={t("common-info.description")} control={control}
                                      rules={{
                                        maxLength: {
                                          value: 100, message: 'Beschreibung ist auf 40 Zeichen beschränkt'
                                        }
                                      }}
                                      type="text"
                                      readonly={!isAdmin()}
                                      error={errors.description}
                                      onChangePartial={onChangeField("description")}/>
                  <InputFormComponent name={"businessNr"} label={t("common-info.business-nr")} control={control} rules={{}}
                                      type="text"
                                      readonly={!isAdmin()} onChangePartial={onChangeField("businessNr")}/>
                  <InputFormComponent name={"vatNumber"} label={t("common-info.vat-number")} control={control} rules={{}}
                                      type="text"
                                      readonly={!isAdmin()}
                                      onChangePartial={onChangeField("vatNumber")}/>
                  <InputFormComponent name={"taxNumber"} label={t("common-info.tax-number")} control={control} rules={{}} type="text"
                                      readonly={!isAdmin()}
                                      onChangePartial={onChangeField("taxNumber")}/>
                  <InputFormComponent name={"allocationMode"} label={t("common-info.allocation-mode")} control={control} rules={{}}
                                      type="text" readonly={true}/>
                  {/* the type of the community with the short form of admin (platform#229, E7) */}
                  <div className="form-element">
                    <IonInput fill="outline" labelPlacement="floating" label={t("common-info.area")}
                              value={areaLabel(eeg.area)} readonly={true}/>
                  </div>
                  {/* from the grid operator's metering point list, read only (platform#229) */}
                  <div className="form-element">
                    <IonInput fill="outline" labelPlacement="floating" label={t("common-info.zone-level")}
                              value={zoneLevelLabel(t, eeg.ecZoneLevel)} readonly={true}/>
                  </div>
                </IonCard>
              </div>
              <div className={"eeg-property-card"}>
                <div className={"header"}>{t("grid-operator.header")}</div>
                <IonCard color="eeglight">

                  <InputFormComponent name={"gridOperator"} label={t("grid-operator.id")} control={control}
                                      rules={{}}
                                      type="text"
                                      onChangePartial={onChangeField("gridOperator")}
                                      readonly={false}/>
                  <InputFormComponent name={"operatorName"} label={t("grid-operator.name")} control={control} rules={{}}
                                      type="text"
                                      onChangePartial={onChangeField("operatorName")}
                                      readonly={false}/>
                </IonCard>
              </div>
              {isAdmin() &&
                <div className={"eeg-property-card"}>
                  <div className={"header"}>{t("mailtemplates.header")}</div>
                  <IonCard color="eeglight">
                    <p style={{padding: "0 16px"}}>{t("mailtemplates.card_text")}</p>
                    <IonButton routerLink="/page/mailtemplates">{t("mailtemplates.card_button")}</IonButton>
                  </IonCard>
                </div>}
            </div>
            <div style={{display: "flex", flexDirection: "column", flexGrow: "1"}}>
              <div className={"eeg-property-card"}>
                <div className={"header"}>{t("address.header")}</div>
                <IonCard color="eeglight">

                  <InputFormComponent name={"address.street"} label={t("address.street")} control={control} rules={{}}
                                      type="text"
                                      readonly={!isAdmin()}
                                      onChangePartial={onChangeField("street")}/>
                  <InputFormComponent name={"address.streetNumber"} label={t("address.street_number")} control={control}
                                      rules={{}}
                                      type="text" readonly={!isAdmin()}
                                      onChangePartial={onChangeField("streetNumber")}/>
                  <InputFormComponent name={"address.zip"} label={t("address.zip")} control={control} rules={{}}
                                      type="text"
                                      readonly={!isAdmin()}
                                      onChangePartial={onChangeField("zip")}/>
                  <InputFormComponent name={"address.city"} label={t("address.city")} control={control} rules={{}}
                                      type="text"
                                      readonly={!isAdmin()}
                                      onChangePartial={onChangeField("city")}/>
                </IonCard>
              </div>
              <div className={"eeg-property-card"}>
                <div className={"header"}>{t("contact.header")}</div>
                <IonCard color="eeglight">
                  <InputFormComponent name={"contactPerson"} label={t("contact.person")} control={control}
                                      readonly={!isAdmin()}
                                      onChangePartial={onChangeField("contactPerson")}/>
                  <PhoneInputForm name={"contact.phone"} control={control} readonly={!isAdmin()} setValue={setValue}
                                  onChangePartial={onChangeField("phone")}/>
                  <InputFormComponent name={"contact.email"} label={t("email")} control={control}
                                      rules={{
                                        // was `regex:` — not a react-hook-form rule key, the
                                        // old check never ran. validate on the normalized
                                        // form so healable input (outer whitespace) is not
                                        // rejected — backend normalizes on save.
                                        validate: (v: string | undefined) => isValidEmailList(v) || t("warnings.email", {context: "wrong"})
                                      }} type="text" readonly={!isAdmin()}
                                      error={errors.contact?.email}
                                      onChangePartial={onChangeField("email")}/>
                </IonCard>
              </div>
              <div className={"eeg-property-card"}>
                <div className={"header"}>{t("account.header")}</div>
                <IonCard color="eeglight">
                  <IbanInputForm name={"accountInfo.iban"} control={control}
                                 readonly={!isAdmin()}
                                 onChangePartial={onChangeField("iban")}/>
                  <InputFormComponent name={"accountInfo.bic"} label={t("account.bic")} control={control}
                                      rules={{regex: /[a-zA-Z\s\-_]*/}} type="text" readonly={!isAdmin()}
                                      onChangePartial={onChangeField("bic")}
                                      error={errors.accountInfo?.creditorId}/>
                  <InputFormComponent name={"accountInfo.owner"} label={t("account.owner")} control={control}
                                      rules={{regex: /[a-zA-Z\s]*/}} type="text" readonly={!isAdmin()}
                                      error={errors.accountInfo?.owner}
                                      onChangePartial={/*onChangeValue*/onChangeField("owner")}/>
                  <InputFormComponent name={"accountInfo.bankName"} label={t("account.name")} control={control}
                                      rules={{regex: /[a-zA-Z\s]*/}} type="text" readonly={!isAdmin()}
                                      onChangePartial={onChangeField("bankName")}
                                      error={errors.accountInfo?.bankName}/>
                  {/* the creditor ID serves direct debit only: none without billing (eegfaktura-dev#56 #13) */}
                  {billing &&
                    <InputFormComponent name={"accountInfo.creditorId"} label={t("account.creditor-id")} control={control}
                                        rules={{regex: /[a-zA-Z\s\-_]*/}} type="text" readonly={!isAdmin()}
                                        onChangePartial={onChangeField("creditor_id")}
                                        error={errors.accountInfo?.creditorId}/>}
                </IonCard>
              </div>
              <div className={"eeg-property-card"}>
                <div className={"header"}>Optional</div>
                <IonCard color="eeglight">
                  <InputFormComponent name={"optionals.website"} label={t("website")} control={control}
                                      rules={{regex: /[a-z\.]*\.\w{3}/}} type="text" readonly={!isAdmin()}
                                      error={errors.optionals?.website}
                                      onChangePartial={onChangeField("website")}/>
                </IonCard>
              </div>

              {billing && <EegBillingConfigCardComponent/>}

            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}
export default EegPage;