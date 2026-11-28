import React, {FC, useEffect, useState} from "react";
import {useFormContext} from "react-hook-form";
import {Metering} from "../../../../models/meteringpoint.model";
import {EegParticipant} from "../../../../models/members.model";
import {IonList, IonListHeader} from "@ionic/react";
import CheckboxComponent from "../../../form/Checkbox.component";
import InputForm from "../../../form/InputForm.component";
import SelectForm from "../../../form/SelectForm.component";
import {useAccessGroups, useTenant} from "../../../../store/hook/Eeg.provider";

import DatePickerFormElement from "../../../form/DatePickerForm.element";
import {useLocale} from "../../../../store/hook/useLocale";
import {REQUESTED_STATES, useRegistrationDateRule} from "../../../form/useRegistrationWindow.hook";

interface MeterAddressFormElementProps {
  participant?: EegParticipant
  isEditable?: boolean
  // showStatus?: boolean
  isOnline?: boolean
  onChange?: (values: {name: string, value: any}[], event?: any) => void
}

const MeterAddressFormElement: FC<MeterAddressFormElementProps> = ({
                                                                     participant,
                                                                     isOnline,
                                                                     isEditable,
                                                                     onChange,
                                                                   }) => {
  const {t} = useLocale("common")
  const {control, watch, setValue, trigger, formState: {errors, defaultValues}} = useFormContext<Metering>()
  const [withOwner, setWithOwner] = useState(false);
  const {isAdmin} = useAccessGroups()
  const {tenant} = useTenant()

  // const isEditable = setValue !== undefined
  // a new metering point without a state counts as not yet requested
  const currentMeterProcessState = (watch ? watch("processState") : undefined) ?? "NEW"

  // „Aktiv ab“ of an online community (platform#272): before the activation it is the requested day (registeredSince),
  // fixed while the registration runs; after it the day the grid operator reported, read only. Offline as before.
  const reported = isOnline && currentMeterProcessState === "ACTIVE"
  const requested = isOnline && REQUESTED_STATES.includes(currentMeterProcessState)
  const choosable = isOnline && !reported && !requested
  const {window: registrationWindow, validate: validateRegistrationDate} =
    useRegistrationDateRule(tenant, !!choosable, defaultValues?.registeredSince)
  // the window can arrive after the day was filled in
  useEffect(() => {
    if (choosable && registrationWindow.to) trigger("registeredSince")
  }, [registrationWindow])
  // a re-activation keeps the date of the first activation (concept, Fachliche Logik 6)
  const hint = currentMeterProcessState === "INACTIVE" || currentMeterProcessState === "REVOKED"
    ? `${t("meteringPoint-active-since_hint")} ${t("meteringPoint-active-since_hint_reactivation")}`
    : t("meteringPoint-active-since_hint")
  const activeSinceLabel = reported ? t("meteringPoint-active-since_reported")
    : requested ? t("meteringPoint-active-since_requested")
      : isOnline && currentMeterProcessState === "NEW" ? t("meteringPoint-active-since_not-requested")
        : t("meteringPoint-active-since")

  const isTakeOverAddressEnabled = () => participant !== undefined && isEditable
  const disableAddressFields = isTakeOverAddressEnabled() && withOwner

  useEffect(() => {
    setWithOwner(false)
  }, [participant])

  const takeOverAddress = (ok: boolean) => {
    if (isTakeOverAddressEnabled() && participant!.billingAddress) {
      if (ok) {
        if (onChange) {
          const values = [
            {name: `street`, value: participant!.billingAddress.street},
            {name: `streetNumber`, value: participant!.billingAddress.streetNumber},
            {name: `city`, value: participant!.billingAddress.city},
            {name: `zip`, value: participant!.billingAddress.zip}
          ]
          onChange(values)
        } else {
          setValue(`street`, participant!.billingAddress.street, {shouldDirty: true, shouldValidate: true});
          setValue(`streetNumber`, participant!.billingAddress.streetNumber, {shouldDirty: true, shouldValidate: true});
          setValue(`city`, participant!.billingAddress.city, {shouldDirty: true, shouldValidate: true});
          setValue(`zip`, participant!.billingAddress.zip, {shouldDirty: true, shouldValidate: true});
        }
      }
      setWithOwner(ok);
    }
  }

  const _onChange = (name: string, value: any) => {
    if (onChange) onChange([{name, value}])
  }

  return (
    <IonList>
      <IonListHeader style={{minHeight: "60px"}}>{t("address.header")}</IonListHeader>
      {isTakeOverAddressEnabled() &&
          <CheckboxComponent label="Adresse vom Besitzer übernehmen" setChecked={takeOverAddress}
                             checked={withOwner} style={{paddingTop: "0px"}}></CheckboxComponent>}
      <InputForm name={"street"} label={t("address.street")} control={control} rules={{required: t("warnings.street_missing")}} type="text"
                 error={errors?.street} disabled={disableAddressFields} onChangePartial={_onChange}/>
      <InputForm name={"streetNumber"} label={t("address.street_number")} control={control}
                 rules={{required: t("warnings.street-number_missing")}}
                 type="text" error={errors?.streetNumber} disabled={disableAddressFields} onChangePartial={_onChange}/>
      <InputForm name={"zip"} label={t("address.zip")} control={control} rules={{required: t("warnings.zip_missing")}}
                 type="text" error={errors?.zip} disabled={disableAddressFields} onChangePartial={_onChange}/>
      <InputForm name={"city"} label={t("address.city")} control={control} rules={{required: t("warnings.city_missing")}} type="text"
                 error={errors?.city} disabled={disableAddressFields} onChangePartial={_onChange}/>
      {isAdmin() && !isOnline &&
          <>
              <SelectForm control={control}
                          name="status"
                          options={
                            [
                              {key: 'NEW', value: "Noch nicht registriert"},
                              {key: 'ACTIVE', value: "Bereits registriert"}
                            ]}
                          label={t("state")}
                          onChangePartial={_onChange}
              />
          </>
      }
      {/*{currentMeterProcessState === "ACTIVE" &&*/}
      {isOnline && !reported ?
          <DatePickerFormElement key="registeredSince" control={control} name={"registeredSince"} label={activeSinceLabel}
                                 placeholder={t("date")} error={errors?.registeredSince} onChangeDate={_onChange}
                                 disabled={requested}
                                 // always a rule: react-hook-form keeps a rule that is left out
                                 rules={{validate: choosable ? validateRegistrationDate : () => true}}
                                 minDate={choosable ? registrationWindow.from : undefined}
                                 maxDate={choosable ? registrationWindow.to : undefined}
                                 hint={choosable ? hint : undefined}/> :
          <DatePickerFormElement key="activeSince" control={control} name={"participantState.activeSince"} label={activeSinceLabel}
                                 placeholder={t("date")} error={errors?.registeredSince} onChangeDate={_onChange}
                                 disabled={reported}/>
      }
      {/*}*/}
    </IonList>
  )
}

export default MeterAddressFormElement;