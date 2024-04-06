import React, {ClipboardEvent, FC, useEffect, useState} from "react";
import {IonCol, IonGrid, IonList, IonRow} from "@ionic/react";
import SelectForm from "../form/SelectForm.component";
import InputForm from "../form/InputForm.component";
import CheckboxComponent from "../form/Checkbox.component";
import {Metering} from "../../models/meteringpoint.model";
import {EegTariff} from "../../models/eeg.model";
import {useFormContext} from "react-hook-form";
import ToggleButtonComponent from "../ToggleButton.component";
import {eegPlug, eegSolar} from "../../eegIcons";
import {EegParticipant} from "../../models/members.model";
import {useEegArea} from "../../store/hook/Eeg.provider";
import {useLocale} from "../../store/hook/useLocale";

interface MeterFormElementProps {
  rates: EegTariff[]
  participant?: EegParticipant
  meterReadOnly?: boolean
  onChange?: (values: {name: string, value: any}[], event?: any) => void
}

const MeterFormElement: FC<MeterFormElementProps> = ({rates, participant, meterReadOnly, onChange}) => {

  const {t} = useLocale("common")
  const area = useEegArea()

  const {control, watch, setValue, formState: {errors}} = useFormContext<Metering>()

  const [selectedDirection, setSelectedDirection] = useState(0);
  const [withWechselrichter, setWithWechselrichter] = useState(false);

  const [direction, status] = watch(['direction', 'status'])

  const isChangeable = () => {
    if (meterReadOnly === undefined) {
      return true
    }
    return !meterReadOnly || status === 'INVALID'
  }

  useEffect(() => {
    // setSelectedDirection(0)
    setWithWechselrichter(false)
  }, [participant])

  useEffect(() => {
    setSelectedDirection(direction === "GENERATION" ? 1 : 0)
  }, [direction])

  const getRatesOption = () => {
    const expectedRateType = selectedDirection === 0 ? 'VZP' : 'EZP'
    const r =  rates.filter(r => r.type === expectedRateType).map((r) => {
      return {key: r.id, value: r.name}
    })
    return [{key: null, value: "Kein Tarif"}, ...r]
  }

  const onChangeDirection = (s: number) => {
    // setSelectedDirection(s)
    const value = s === 0 ? "CONSUMPTION" : "GENERATION"
    setValue(`direction`, value);
    _onChange && _onChange("direction", value)
  }

  const handleMeterPaste = (e: ClipboardEvent<HTMLIonInputElement>) => {

    e.persist()
    e.clipboardData.items[0].getAsString(text => {
      setValue && setValue("meteringPoint", text.replace(/[-_]/gi, "").replace(/\s/gi, ""))
    })
    e.stopPropagation()
  }

  const _onChange = (name: string, value: any, event?: any) => {
    if (onChange) onChange([{name, value}], event)
  }

  const getTarifHeaderString = () => {
    return selectedDirection === 0 ?
      ("Verbrauchertarife")
      :
      ("Erzeugertarife")
  }

  return (
    <>
      <IonGrid>
        <IonRow>
          <IonCol size="auto">
            <ToggleButtonComponent
              buttons={[{label: t("consumer"), icon: eegPlug}, {label: t("producer"), icon: eegSolar}]}
              onChange={onChangeDirection}
              value={selectedDirection}
              changeable={isChangeable()}
            />
          </IonCol>
        </IonRow>
      </IonGrid>
      <IonList>
        <SelectForm name={"tariff_id"} label={t("tariff")} control={control} options={getRatesOption()} onChangePartial={_onChange} interfaceOptions={{header: getTarifHeaderString()}}/>
        <InputForm name={"meteringPoint"} label={t("metering")} control={control} type="text" readonly={meterReadOnly} protectedControl={meterReadOnly}
                   counter={true} maxlength={33}
                   rules={{
                     required: t("metering_missing_msg"),
                     minLength: {value: 33, message: "MIN-Zählpunktnummer beginnt mit AT gefolgt von 31 Nummern"},
                     maxLength: {value: 33, message: "MAX-Zählpunktnummer beginnt mit AT gefolgt von 31 Nummern"},
                     pattern: {
                       value: /^AT[0-9A-Z]*$/,
                       message: "Zählpunktnummer beginnt mit AT gefolgt von 31 Nummern od. Großbuchstaben"
                     }
                   }}
                   error={errors?.meteringPoint}
                   onPaste={handleMeterPaste}
                   onChangePartial={_onChange}
        />
        <InputForm name={"partFact"} label={t("process.partFact.label")} control={control} rules={{required: true}}
                   type="number" onChangePartial={_onChange} protectedControl={!isChangeable()}/>
        {area && area === 'BEG' && <>
            <InputForm name={"gridOperatorId"} label={t("gridOperator_id")} control={control} rules={{required: true}}
                       type="text" onChangePartial={_onChange} protectedControl={!isChangeable()}/>
            <InputForm name={"gridOperatorName"} label={t("gridOperator_name")} control={control} rules={{required: true}}
                       type="text" onChangePartial={_onChange} protectedControl={!isChangeable()}/>
        </>}
        <CheckboxComponent label={t("inverterCheckbox_label")} setChecked={setWithWechselrichter}
                           checked={withWechselrichter} style={{paddingTop: "0px"}}></CheckboxComponent>
        {withWechselrichter && (
          <InputForm name={"inverterId"} label={t("inverternr_label")} control={control} rules={{required: false}}
                     type="text" onChangePartial={_onChange}/>
        )}
        <InputForm name={"transformer"} label={t("transformer_label")} control={control} rules={{required: false}} type="text" onChangePartial={_onChange}/>
        <InputForm name={"equipmentNumber"} label={t("equipmentNumber_label")} control={control} rules={{required: false}}
                   type="text" onChangePartial={_onChange}/>
        <InputForm name={"equipmentName"} label={t("equipmentName_label")} control={control} rules={{required: false}} type="text" onChangePartial={_onChange}/>
      </IonList>
    </>
  )
}

export default MeterFormElement;