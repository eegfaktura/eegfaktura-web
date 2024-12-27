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

const EMPTY_EEG_ENTITY = {
  communityId: "", rcNumber: "", name: "",
  legal: "", salesTax: "", taxNumber: "", vatNumber: "",
  businessNr: "", settlement: "", description: "", gridOperator: "", operatorName: "",
  settlementInterval: 'MONTHLY', allocationMode: "DYNAMIC", area: "LOCAL",
  address: {city: "", type: "BILLING", street: "", streetNumber: "", zip: ""} as Address,
  contact: {email: "", phone: ""} as Contact,
  accountInfo: {bankName: "", iban: "", owner: "", sepa: false} as AccountInfo,
  optionals: {website: ""} as Optionals,
  online: false,
} as Eeg

const EegPage: FC = () => {

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
    setTenantsState(tenants.map(t => t.toUpperCase()).sort((a,b) => a.localeCompare(b)))
  }, [tenants])

  useEffect(() => {
    if (!eeg) {
      reset(EMPTY_EEG_ENTITY, { keepDefaultValues: true })
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
                {/*<form onBlur={handleSubmit(onSubmit)}>*/}
                  <div className={"header"}>Allgemeines</div>
                  <IonCard color="eeglight">

                    <InputFormComponent name={"rcNumber"} label="EC-Nummer" control={control} rules={{}} type="text"
                                        readonly={true}/>
                    <InputFormComponent name={"communityId"} label="ID" control={control} rules={{}}
                                        type="text"
                                        readonly={true}/>

                    {/*<InputFormComponent name={"legal"} label="Rechtsform" control={control} rules={{}} type="text"*/}
                    {/*                    readonly={true}/>*/}
                    <SelectForm name={"legal"} label="Rechtsform" control={control} options={[
                      {key: "verein", value: "Verein"},
                      {key: "genossenschaft", value: "Genossenschaft"},
                      {key: "gesellschaft", value: "Gesellschaft"}]} placeholder="Rechtsform" disabled={!isAdmin()}/>
                    <InputFormComponent name={"description"} label="EEG Bezeichnung" control={control}
                                        rules={{maxLength : {
                                          value: 100, message: 'Beschreibung ist auf 40 Zeichen beschränkt'
                                        }}}
                                        type="text"
                                        readonly={!isAdmin()}
                                        error={errors.description}
                                        onChangePartial={onChangeField("description")}/>
                    <InputFormComponent name={"businessNr"} label="Firmennummer" control={control} rules={{}}
                                        type="text"
                                        readonly={!isAdmin()} onChangePartial={onChangeField("businessNr")}/>
                    <InputFormComponent name={"vatNumber"} label="Umsatzsteuer ID" control={control} rules={{}}
                                        type="text"
                                        readonly={!isAdmin()}
                                        onChangePartial={onChangeField("vatNumber")}/>
                    <InputFormComponent name={"taxNumber"} label="Steuernummer" control={control} rules={{}} type="text"
                                        readonly={!isAdmin()}
                                        onChangePartial={onChangeField("taxNumber")}/>
                    <InputFormComponent name={"allocationMode"} label="Verteilung" control={control} rules={{}}
                                        type="text" readonly={true}/>
                  </IonCard>
                {/*</form>*/}
              </div>
            </div>
            <div style={{display: "flex", flexDirection: "column", flexGrow: "1"}}>

              {/*<form onBlur={handleSubmit(onSubmit)}>*/}
                <div className={"eeg-property-card"}>
                  <div className={"header"}>Adresse</div>
                  <IonCard color="eeglight">

                    <InputFormComponent name={"address.street"} label="Straße" control={control} rules={{}} type="text"
                                        readonly={!isAdmin()}
                                        onChangePartial={onChangeField("street")}/>
                    <InputFormComponent name={"address.streetNumber"} label="Hausnummer" control={control} rules={{}}
                                        type="text" readonly={!isAdmin()}
                                        onChangePartial={onChangeField("streetNumber")}/>
                    <InputFormComponent name={"address.zip"} label="Postleitzahl" control={control} rules={{}}
                                        type="text"
                                        readonly={!isAdmin()}
                                        onChangePartial={onChangeField("zip")}/>
                    <InputFormComponent name={"address.city"} label="Ort" control={control} rules={{}} type="text"
                                        readonly={!isAdmin()}
                                        onChangePartial={onChangeField("city")}/>
                  </IonCard>
                </div>

                <div className={"eeg-property-card"}>
                  <div className={"header"}>Kontakt</div>
                  <IonCard color="eeglight">
                    <PhoneInputForm name={"contact.phone"} control={control} readonly={!isAdmin()} setValue={setValue}
                                        onChangePartial={onChangeField("phone")}/>
                    <InputFormComponent name={"contact.email"} label="E-Mail" control={control}
                                        rules={{regex: /[a-z\.]@[a-z]\.\w{3}/}} type="text" readonly={!isAdmin()}
                                        error={errors.contact?.email}
                                        onChangePartial={onChangeField("email")}/>
                  </IonCard>
                </div>

                <div className={"eeg-property-card"}>
                  <div className={"header"}>Bankdaten</div>
                  <IonCard color="eeglight">
                    <IbanInputForm name={"accountInfo.iban"} control={control}
                                        readonly={!isAdmin()}
                                        onChangePartial={onChangeField("iban")}/>
                    <InputFormComponent name={"accountInfo.owner"} label="Kontoinhaber" control={control}
                                        rules={{regex: /[a-zA-Z\s]*/}} type="text" readonly={!isAdmin()}
                                        error={errors.accountInfo?.owner}
                                        onChangePartial={onChangeField("owner")}/>
                    <InputFormComponent name={"accountInfo.bankName"} label="Bank Name" control={control}
                                        rules={{regex: /[a-zA-Z\s]*/}} type="text" readonly={!isAdmin()}
                                        onChangePartial={onChangeField("bankName")}
                                        error={errors.accountInfo?.bankName}/>
                  </IonCard>
                </div>

                <div className={"eeg-property-card"}>
                  <div className={"header"}>Optional</div>
                  <IonCard color="eeglight">
                    <InputFormComponent name={"optionals.website"} label="Webseite" control={control}
                                        rules={{regex: /[a-z\.]*\.\w{3}/}} type="text" readonly={!isAdmin()}
                                        error={errors.optionals?.website}
                                        onChangePartial={onChangeField("website")}/>
                  </IonCard>
                </div>
              {/*</form>*/}

              <EegBillingConfigCardComponent/>

            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}
export default EegPage;