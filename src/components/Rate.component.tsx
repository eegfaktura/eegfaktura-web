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
      // if (!s) {
      //   // setValue("vatInPercent", "0")
      //   // setValue("vatSupplementaryText", "")
      // }
      setValue("useVat", s, {shouldValidate: true, shouldDirty: true})
    }

    const setMeteringPointFeeEnabled = (s: boolean) => {
      setValue("useMeteringPointFee", s, {shouldValidate: true, shouldDirty: true})
      // if (!s) setValue("meteringPointFee", undefined, {shouldValidate: true, shouldDirty: true})
    }

    const useVat = watch("useVat");
    const useMeteringPointFee = watch("useMeteringPointFee")

    // ZVT (zeitvariabler Tarif)
    const useTimeTariff = watch("useTimeTariff")
    const tt1Active = watch("timeTariff1Active")
    const tt2Active = watch("timeTariff2Active")
    const tt1From = watch("timeTariff1From")
    const tt1To = watch("timeTariff1To")
    const tt2From = watch("timeTariff2From")
    const tt2To = watch("timeTariff2To")

    const parseHHMM = (s?: string): number | undefined => {
      if (!s) return undefined
      const parts = s.split(":")
      if (parts.length < 2) return undefined
      const hh = Number(parts[0]), mm = Number(parts[1])
      if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined
      return hh * 60 + mm
    }
    const windowContains = (from: number, to: number, x: number) =>
      from < to ? (x >= from && x < to) : (x >= from || x < to)

    // Zyklische Ueberlappung der beiden aktiven Zeitfenster (Mitternachts-
    // ueberlauf erlaubt) - gespiegelt zur serverseitigen Validierung.
    const windowsOverlap = (): boolean => {
      if (!tt1Active || !tt2Active) return false
      const f1 = parseHHMM(tt1From), t1 = parseHHMM(tt1To)
      const f2 = parseHHMM(tt2From), t2 = parseHHMM(tt2To)
      if (f1 === undefined || t1 === undefined || f2 === undefined || t2 === undefined) return false
      return windowContains(f1, t1, f2) || windowContains(f2, t2, f1)
    }

    const timeRules = (otherField: "timeTariff1From" | "timeTariff1To" | "timeTariff2From" | "timeTariff2To") => ({
      required: t("zvt.warn_time_missing"),
      validate: {
        raster: (v: string) => {
          const m = parseHHMM(v)
          return (m !== undefined && m % 15 === 0) || t("zvt.warn_raster")
        },
        notEqual: (v: string) => {
          const other = parseHHMM(watch(otherField))
          return other === undefined || parseHHMM(v) !== other || t("zvt.warn_equal")
        },
        overlap: () => !windowsOverlap() || t("zvt.warn_overlap")
      }
    })

    const setTimeTariffMode = (timeBased: boolean) => {
      setValue("useTimeTariff", timeBased, {shouldValidate: true, shouldDirty: true})
      if (timeBased) {
        // freie kWh gelten nur im Einfach-Modus
        setValue("freeKWh", undefined, {shouldValidate: true, shouldDirty: true})
      }
    }

    const setTimeWindowActive = (n: 1 | 2, active: boolean) => {
      setValue(n === 1 ? "timeTariff1Active" : "timeTariff2Active", active,
        {shouldValidate: true, shouldDirty: true})
    }

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
                  <NumberInputForm label={t("meteringPointFee")} control={control} name="meteringPointFee"
                                   rules={{required: t("warnings.fee_missing")}}/>}
              {useMeteringPointFee && currentRateType === 'EZP' &&
                  <NumberInputForm label={t("meteringPointVat")} control={control} name="meteringPointVat"
                                   rules={{required: false}}/>}

            </>
          )
      }
      return (<></>)
    }

    const renderUseVat = () => {
      return (
        <>
          <CheckboxComponent label={t("useVat")} setChecked={(c) => setShowVat(c)}
                             checked={useVat!}/>
          {useVat &&
              <>
                  <InputFormComponent label={t("vatInPercent")} control={control} name="vatInPercent"
                                      rules={{required: t("warnings.vat_missing"),
                                        max: {value: 100, message: t("warnings.vat_zero")},
                                        min: {value: 0, message: t("warnings.vat_to_big")}}}/>
                  <InputFormComponent label={t("vatSupplementaryText")} control={control} name="vatSupplementaryText" rules={{required: false}}/>
              </>
          }
        </>
      )
    }

    const renderZvtWindow = (n: 1 | 2) => {
      const active = n === 1 ? tt1Active : tt2Active
      const nameField = n === 1 ? "timeTariff1Name" : "timeTariff2Name"
      const fromField = n === 1 ? "timeTariff1From" : "timeTariff2From"
      const toField = n === 1 ? "timeTariff1To" : "timeTariff2To"
      const priceField = n === 1 ? "timeTariff1CentPerKWh" : "timeTariff2CentPerKWh"
      return (
        <div>
          <CheckboxComponent label={t(`zvt.window${n}_active`)}
                             setChecked={(c) => setTimeWindowActive(n, c)}
                             checked={!!active}/>
          {active &&
              <>
                  <InputFormComponent label={t("zvt.windowName")} control={control} name={nameField}
                                      rules={{required: false}} type="text"/>
                  <InputFormComponent label={t("zvt.windowFrom")} control={control} name={fromField}
                                      rules={timeRules(toField as any)} type="time"/>
                  <InputFormComponent label={t("zvt.windowTo")} control={control} name={toField}
                                      rules={timeRules(fromField as any)} type="time"/>
                  <NumberInputForm label={t("zvt.windowPrice")} control={control} name={priceField}
                                   rules={{required: t("zvt.warn_price_missing")}}/>
              </>
          }
        </div>
      )
    }

    const renderZvtMode = () => (
      <ToggleButtonComponent
        buttons={[{label: t("zvt.simple")}, {label: t("zvt.timeBased")}]}
        onChange={(idx) => setTimeTariffMode(idx === 1)}
        value={useTimeTariff ? 1 : 0}
        changeable={true}
      />
    )

    const RateFormType = (rate: EegTariff) => {
      switch (currentRateType) {
        case "EEG":
          return (
            <div>
              <NumberInputForm label={t("participantFee")} control={control} name={"participantFee"}
                               rules={{pattern: {value: /^[0-9]*$/, message: "Nur Zahlen erlaubt"}}}
                               error={errors.participantFee}/>
              <InputFormComponent label={t("discount")} control={control} name={"discount"}
                                  rules={{pattern: {value: /^[0-9]*$/, message: "Nur Zahlen erlaubt"}}} isNumber={true}
                                  error={errors.discount}/>
            </div>
          )
        case "EZP":
          return (
            <div>
              {renderZvtMode()}
              {useTimeTariff ? (
                <>
                  <NumberInputForm label={t("zvt.basePrice")} control={control} name={"centPerKWh"}/>
                  {renderZvtWindow(1)}
                  {renderZvtWindow(2)}
                </>
              ) : (
                <NumberInputForm label={t("centPerKWh")} control={control} name={"centPerKWh"}/>
              )}
            </div>
          )
        case "VZP":
          return (
            <div>
              {renderZvtMode()}
              {useTimeTariff ? (
                <>
                  <NumberInputForm label={t("zvt.basePrice")} control={control} name={"centPerKWh"}/>
                  {renderZvtWindow(1)}
                  {renderZvtWindow(2)}
                </>
              ) : (
                <>
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
                      pattern: {value: /^[0-9]*$/, message: "Nur Zahlen erlaubt"},
                    }}
                    isNumber={true}
                    error={errors.freeKWh}
                  />
                </>
              )}
              <InputFormComponent
                label={t("discount")}
                control={control}
                name={"discount"}
                rules={{
                  pattern: {value: /^[0-9]*$/, message: "Nur Zahlen erlaubt"},
                }}
                isNumber={true}
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
                                  rules={{
                                    pattern: {
                                      value: /^[A-Za-z0-9\s-_]*$/,
                                      message: "Bitte nur Buchstaben, Ziffern und '-_ ' eingeben"
                                    }
                                  }} type="text" error={errors.name}/>
              {renderUseVat()}
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