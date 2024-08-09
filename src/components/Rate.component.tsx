import React, {FC} from "react";
import {IonCard, IonCardContent, IonCol, IonGrid, IonList, IonListHeader, IonRow} from "@ionic/react";
import InputFormComponent from "./form/InputForm.component";
import {useFormContext} from "react-hook-form";
import {EegTariff} from "../models/eeg.model";
import CheckboxComponent from "./form/Checkbox.component";
import ToggleButtonComponent from "./ToggleButton.component";
import {useRateType} from "../store/hook/Rate.provider";
import NumberInputForm from "./form/NumberInput.component";
import {useLocale} from "../store/hook/useLocale";

const RateComponent: FC<{ rate: EegTariff, onSubmit: (data: EegTariff) => void, submitId: string, mode?: 'NEW' }> =
  ({rate, onSubmit, submitId, mode}) => {

    const {t} = useLocale("common")
    const {currentRateType, setRateType} = useRateType()
    const {
      // register,
      handleSubmit,
      control,
      setValue,
      watch,
      reset,
      formState: {errors}
    } = useFormContext<EegTariff>()

    const setShowVat = (s: boolean) => {
      if (!s) {
        setValue("vatInPercent", "0")
      }
      setValue("useVat", s)
    }

    const setMeteringPointFeeEnabled = (s: boolean) => {
      setValue("useMeteringPointFee", s)
      if (!s) setValue("meteringPointFee", undefined)
    }

    const useVat = watch("useVat");
    const useMeteringPointFee = watch("useMeteringPointFee")

    const handleRateType = (type: number) => {
      switch (type) {
        case 0:
          reset()
          setValue("type", "EEG");
          setRateType('EEG')
          break;
        case 1:
          reset()
          setValue("type", "EZP");
          setRateType('EZP')
          break;
        case 2:
          reset()
          setValue("type", "VZP");
          setRateType('VZP')
          break;
      }
    }

    const transformType = (type: string): number => {
      switch (type) {
        case 'EEG':
          return 0;
        case 'EZP':
          return 1;
        case 'VZP':
          return 2;
      }
      return 0
    }

    const editable = mode === 'NEW';

    const renderMeteringPointFee = () => {
      switch (currentRateType) {
        case "EZP":
        case "VZP":
          return (
            <>
              <CheckboxComponent label={t("useMeteringPointFee")} setChecked={(c) => setMeteringPointFeeEnabled(c)}
                                 checked={useMeteringPointFee!}/>
              {useMeteringPointFee &&
                <NumberInputForm label={t("meteringPointFee")} control={control} name="meteringPointFee"/>}
              {useMeteringPointFee && currentRateType === 'EZP' &&
                <NumberInputForm label={t("meteringPointVat")} control={control} name="meteringPointVat"/>}

            </>
        )
      }
      return (<></>)
    }
    
    const RateFormType = (rate: EegTariff) => {
      switch (currentRateType) {
        case "EEG":
          return (
            <div>
              <NumberInputForm label={t("participantFee")} control={control} name={"participantFee"}
                                  rules={{pattern: {value: /^[0-9]*$/, message: "Nur Zahlen erlaubt"}}} error={errors.participantFee}/>
              <InputFormComponent label={t("discount")} control={control} name={"discount"}
                                  rules={{pattern: {value: /^[0-9]*$/, message: "Nur Zahlen erlaubt"}}} type="text" error={errors.discount}/>
            </div>
          )
        case "EZP":
          return (
            <div>
              <NumberInputForm label={t("centPerKWh")} control={control} name={"centPerKWh"}/>
            </div>
          )
        case "VZP":
          return (
            <div>
              <NumberInputForm
                label={t("centPerKWh")}
                control={control}
                name={"centPerKWh"}
              />
              <InputFormComponent
                label={t("freeKWh")}
                control={control}
                name={"freeKWh"}
                rules={{
                  pattern: { value: /^[0-9]*$/, message: "Nur Zahlen erlaubt" },
                }}
                type="text"
                error={errors.freeKWh}
              />
              <InputFormComponent
                label={t("discount")}
                control={control}
                name={"discount"}
                rules={{
                  pattern: { value: /^[0-9]*$/, message: "Nur Zahlen erlaubt" },
                }}
                type="text"
                error={errors.discount}
              />
            </div>
          );
      }
    }

    return (
      <IonCard color={"eeglight"}>
        <IonGrid>
          <IonRow>
            <IonCol>
              <ToggleButtonComponent
                buttons={[{label: 'Mitglied'}, {label: 'Erzeuger'}, {label: 'Verbraucher'}]}
                onChange={handleRateType}
                value={transformType(currentRateType)}
                changeable={editable}
              />
            </IonCol>
          </IonRow>
        </IonGrid>
        <form id={submitId} onSubmit={handleSubmit(onSubmit)}>
          <IonCardContent color="eeglight">
            <IonList color="eeglight">
              <InputFormComponent label={t("tariffLabel")} control={control} name="name"
                                  rules={{pattern: {value: /^[A-Za-z0-9\s-_]*$/, message: "Bitte nur Buchstaben, Ziffern und '-_ ' eingeben"}}} type="text" error={errors.name}/>
              {/*<Input label={"Tarifbezeichnung"} labelPlacement={"floating"} {...register('name')} />*/}
              <CheckboxComponent label={t("useVat")} setChecked={(c) => setShowVat(c)}
                                 checked={useVat!}/>
              {useVat &&
                <>
                  <InputFormComponent label={t("vatInPercent")} control={control} name="vatInPercent"/>
                  <InputFormComponent label={t("vatSupplementaryText")} control={control} name="vatSupplementaryText"/>
                </>
              }
              {renderMeteringPointFee()}
            </IonList>
            <IonList color="eeglight">
              <IonListHeader>{t("tariffParts")}</IonListHeader>
              {RateFormType(rate)}
            </IonList>
          </IonCardContent>
        </form>
      </IonCard>
    )
  }

export default RateComponent;