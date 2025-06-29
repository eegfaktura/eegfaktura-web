import React, {FC, useContext, useEffect, useState} from "react";
import {
  IonButton,
  IonCard,
  IonContent,
  IonItem,
  IonPage, IonSelect, IonSelectOption,
  IonToggle, SelectChangeEventDetail, SelectCustomEvent
} from "@ionic/react";
import InputFormComponent from "../components/form/InputForm.component";
import {useAppDispatch, useAppSelector} from "../store";
import {eegSelector, selectedTenant, selectTenant, updateEegModel} from "../store/eeg";
import {Controller, useForm} from "react-hook-form";
import SelectForm from "../components/form/SelectForm.component";

import "./Eeg.page.scss"
import {useTenants} from "../store/hook/AuthProvider";
import {IonSelectCustomEvent} from "@ionic/core/dist/types/components";
import {EegContext, useAccessGroups, useTenant, useTenantSwitch} from "../store/hook/Eeg.provider";
import EegBillingConfigCardComponent from "../components/EegBillingConfigCard.component";
import {AccountInfo, Address, Contact, Eeg, Optionals} from "../models/eeg.model";
import {IbanInputForm} from "../components/form/IbanInputForm";
import {PhoneInputForm} from "../components/form/PhoneInputForm";
import {useLocale} from "../store/hook/useLocale";

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
  const switchTenant = useTenantSwitch()

  const {handleSubmit, setValue, reset, control, formState: {errors, isDirty, dirtyFields}} =
    useForm({
      defaultValues: eeg,
      values: eeg,
      mode: "all",
    })
  const [tenantsState, setTenantsState] = useState<string[]>([])
  const tenants = useTenants()

  useEffect(() => {
    // setTenantState(tenant);
    setTenantsState(tenants.map(t => t.toUpperCase()).sort((a, b) => a.localeCompare(b)))
  }, [tenants])

  useEffect(() => {
    if (!eeg) {
      reset(EMPTY_EEG_ENTITY, {keepDefaultValues: true})
    } else {
      reset(eeg)
    }
  }, [eeg]);

  const onSwitchTenant = (e: SelectCustomEvent<string>) => {
    const tenant = e.detail.value;
    switchTenant(tenant)
  }

  const onChangeField = (mapper: string) => (name: string, value: any) => {
    dispatcher(updateEegModel({
      tenant, eeg: {[mapper]: value}
    }))
  }

  const onChangeValue = (property: string) => (e: IonSelectCustomEvent<SelectChangeEventDetail>) => {
    dispatcher(updateEegModel({tenant, eeg: {[property]: e.detail.value}}))
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <div style={{flexGrow: "1", background: "#EAE7D9"}}>
          <div style={{display: "flex", flexDirection: "row"}}>

            <div style={{display: "flex", flexDirection: "column", flexGrow: "1"}}>
              <div className={"eeg-property-card"}>
                <div className={"header"}>Einstellungen</div>
                <IonCard color="eeglight">
                  <div className="form-element">
                    {/*<IonItem fill="outline">*/}
                    {/*<IonLabel position="floating">RC Nummer</IonLabel>*/}
                    <IonSelect fill="outline" label="Auswahl Gemeinschaft" labelPlacement={"floating"}
                               className="select-box"
                               value={tenant}
                               onIonChange={onSwitchTenant}>
                      {tenantsState && tenantsState.map((o, idx) => (
                          <IonSelectOption key={idx} value={o}>{o}</IonSelectOption>
                        )
                      )}
                    </IonSelect>
                    {/*</IonItem>*/}
                  </div>
                  {/*<form>*/}
                  <SelectForm label={"Abrechnungszeitraum"} placeholder={"Abrechnungszeitraum"} control={control}
                              name={"settlementInterval"} options={[
                    {key: "MONTHLY", value: "Monatlich"},
                    {key: "QUARTER", value: "Vierteljährlich"},
                    {key: "BIANNUAL", value: "Halbjährlich"},
                    {key: "ANNUAL", value: "Jährlich"},
                  ]} onIonChange={onChangeValue("settlementInterval")} disabled={true}></SelectForm>
                  <IonItem lines="none" style={{marginRight: "16px"}}>
                    {/*<IonLabel slot="start">SEPA aktiv</IonLabel>*/}
                    <Controller
                      name={"accountInfo.sepa"}
                      control={control}
                      render={({field}) => {
                        const {onChange, value} = field;
                        return (<IonToggle
                          style={{width: "100%"}}
                          slot="start"
                          labelPlacement="start"
                          checked={false}
                          disabled={true}
                          onIonChange={(e) => {
                            onChange(e.detail.checked);
                          }}>SEPA aktiv</IonToggle>)
                      }
                      }
                    />
                  </IonItem>
                  {/*</form>*/}
                </IonCard>
              </div>
              <div className={"eeg-property-card"}>
                <div className={"header"}>{t("common-info.header")}</div>
                <IonCard color="eeglight">

                  <InputFormComponent name={"rcNumber"} label={t("common-info.ec-number")} control={control} rules={{}} type="text"
                                      readonly={true}/>
                  <InputFormComponent name={"communityId"} label={t("common-info.community-id")} control={control} rules={{}}
                                      type="text"
                                      readonly={true}/>

                  {/*<InputFormComponent name={"legal"} label="Rechtsform" control={control} rules={{}} type="text"*/}
                  {/*                    readonly={true}/>*/}
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
                                      rules={{regex: /[a-z\.]@[a-z]\.\w{3}/}} type="text" readonly={!isAdmin()}
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
                  <InputFormComponent name={"accountInfo.owner"} label={t("account.owner")} control={control}
                                      rules={{regex: /[a-zA-Z\s]*/}} type="text" readonly={!isAdmin()}
                                      error={errors.accountInfo?.owner}
                                      onChangePartial={/*onChangeValue*/onChangeField("owner")}/>
                  <InputFormComponent name={"accountInfo.bankName"} label={t("account.name")} control={control}
                                      rules={{regex: /[a-zA-Z\s]*/}} type="text" readonly={!isAdmin()}
                                      onChangePartial={onChangeField("bankName")}
                                      error={errors.accountInfo?.bankName}/>
                  <InputFormComponent name={"accountInfo.creditorId"} label={t("account.creditor-id")} control={control}
                                      rules={{regex: /[a-zA-Z\s\-_]*/}} type="text" readonly={!isAdmin()}
                                      onChangePartial={onChangeField("creditor_id")}
                                      error={errors.accountInfo?.creditorId}/>
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

              <EegBillingConfigCardComponent/>

            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}
export default EegPage;