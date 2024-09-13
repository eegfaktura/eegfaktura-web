import React, {FC, useEffect, useState} from "react";
import {useFormContext} from "react-hook-form";
import {Metering} from "../../../../models/meteringpoint.model";
import {EegParticipant} from "../../../../models/members.model";
import {IonList, IonListHeader} from "@ionic/react";
import CheckboxComponent from "../../../form/Checkbox.component";
import InputForm from "../../../form/InputForm.component";
import SelectForm from "../../../form/SelectForm.component";
import {useAccessGroups} from "../../../../store/hook/Eeg.provider";

import DatePickerFormElement from "../../../form/DatePickerForm.element";
import {useLocale} from "../../../../store/hook/useLocale";

interface MeterAddressFormElementProps {
  participant?: EegParticipant
  isEditable?: boolean
  // showStatus?: boolean
  isOnline?: boolean
  showActivationMode: boolean
  onChange?: (values: {name: string, value: any}[], event?: any) => void
}

const MeterAddressFormElement: FC<MeterAddressFormElementProps> = ({
                                                                     participant,
                                                                     isOnline,
                                                                     isEditable,
                                                                     onChange,
                                                                     showActivationMode,
                                                                   }) => {
  const {t} = useLocale("common")
  const {control, watch, setValue, formState: {errors}} = useFormContext<Metering>()
  const [withOwner, setWithOwner] = useState(false);
  // const [offline, setOffline] = useState(false);
  const {isAdmin} = useAccessGroups()

  // const isEditable = setValue !== undefined
  const currentMeterProcessState = watch ? watch("processState") : "NEW"
  const offline = watch ? watch("activationMode") : 'ONLINE'

  const isTakeOverAddressEnabled = () => participant !== undefined && isEditable
  const disableAddressFields = isTakeOverAddressEnabled() && withOwner

  useEffect(() => {
    setWithOwner(false)
  }, [participant])

  const onSetOffline = (o: boolean) => {
    // setOffline(o)
    setValue("activationMode", o ? "OFFLINE" : "ONLINE")
  }

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
      <IonListHeader style={{minHeight: "60px"}}>Adresse</IonListHeader>
      {isTakeOverAddressEnabled() &&
          <CheckboxComponent label="Adresse vom Besitzer übernehmen" setChecked={takeOverAddress}
                             checked={withOwner} style={{paddingTop: "0px"}}></CheckboxComponent>}
      <InputForm name={"street"} label={t("street")} control={control} rules={{required: t("street_missing")}} type="text"
                 error={errors?.street} disabled={disableAddressFields} onChangePartial={_onChange}/>
      <InputForm name={"streetNumber"} label={t("street_number")} control={control}
                 rules={{
                   required: t("street-number_missing"),
                   pattern: {
                     value: /^[0-9A-Za-z\/\-\\\s]*$/,
                     message: "Ungültige Zeichen. Erlaubt sind 0-9, A-Z, a-z, \,/,-, ]"
                   }
                 }}
                 type="text" error={errors?.streetNumber} disabled={disableAddressFields} onChangePartial={_onChange}/>
      <InputForm name={"zip"} label={t("street")} control={control} rules={{required: t("street_missing")}}
                 type="text" error={errors?.zip} disabled={disableAddressFields} onChangePartial={_onChange}/>
      <InputForm name={"city"} label={t("city")} control={control} rules={{required: t("city_missing")}} type="text"
                 error={errors?.city} disabled={disableAddressFields} onChangePartial={_onChange}/>
      {showActivationMode &&
      <CheckboxComponent label="Offline Registrierung" setChecked={onSetOffline}
                         checked={offline === 'OFFLINE'} style={{paddingTop: "0px"}}></CheckboxComponent>
      }
      { showActivationMode && offline === 'OFFLINE' &&
          <InputForm name={"activationCode"} label="Activierungs-Code" control={control} rules={{required: "ActivierungsCode erforderlich"}} type="text"
                     counter={true} maxlength={35} error={errors?.activationCode} onChangePartial={_onChange}/>
      }
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
          <DatePickerFormElement control={control} name={"participantState.activeSince"} label={t("meteringPoint-active-since")}
                                 placeholder={t("date")} error={errors?.registeredSince} onChangeDate={_onChange}/>
      {/*}*/}
    </IonList>
  )
}

export default MeterAddressFormElement;