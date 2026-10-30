import React, {FC, forwardRef, useEffect, useState} from "react";
import {IonButton, IonContent, IonInput, IonItem, useIonAlert} from "@ionic/react";
import InputForm from "../form/InputForm.component";
import SelectForm from "../form/SelectForm.component";
import DatePicker from "react-datepicker";
import {DATE_PICKER_FORMAT, DATE_PICKER_LOCALE} from "../../util/DateFormat.util";
import {useForm} from "react-hook-form";
import {Metering} from "../../models/meteringpoint.model";
import {EdaProcess, Eeg} from "../../models/eeg.model";
import {EegParticipant} from "../../models/members.model";
import CorePageTemplate from "../core/CorePage.template";
import ProcessHeaderComponent from "./ProcessHeader.component";
import ProcessContentComponent from "./ProcessContent.component";
import {Api} from "../../service";
import CheckboxComponent from "../form/Checkbox.component";
import {useLocale} from "../../store/hook/useLocale";
import {BasicSelectComponent, SelectOptions} from "../form/BasicSelect.component";
import {JoinStrings} from "../../util/Helper.util";
import {meteringDisplayName, selectedMeters} from "../../util/FilterHelper";
import {TFunction} from "i18next";
import {useProcessFeedback} from "./useProcessFeedback";
import {useTenant} from "../../store/hook/Eeg.provider";
import {SyncEnergyMeter, SyncEnergyResult} from "../../service/eeg.service";
import {buildBillingCheckRequest} from "../participantPane/BillingCheck.functions";
import {
  entireConfirmation,
  metersToCheck,
  cappedNote,
  NOTHING_BEFORE_TODAY,
  NOTHING_MISSING,
  NOTHING_TO_CHECK,
  sendFeedback,
  smartConfirmation,
  smartPeriod,
  smartPlan,
  smartRequest
} from "./SmartRequest.functions";

interface ProcessValues {
  communityId: string | undefined
  participantId: string | undefined
  meteringPoints: string[] | undefined
}
interface ProcessRequestValuesComponentProps {
  eeg: Eeg
  meters: Metering[]
  participants: EegParticipant[]
  edaProcess: EdaProcess
}

export const requestValuesMeterLabel = (m: Metering, t: TFunction) => JoinStrings(" ", "", meteringDisplayName(m, t), m.processState)

const ProcessRequestValuesComponent: FC<ProcessRequestValuesComponentProps> = ({eeg, meters, participants, edaProcess}) => {
  const processValues = {
    communityId: eeg.communityId,
    participantId: undefined,
    meteringPoints: undefined,
  }

  const {t} = useLocale("common")
  const {sent, failed, info} = useProcessFeedback()
  const tenant = useTenant()
  const [alert] = useIonAlert()
  const {handleSubmit, reset,
    control, watch,
    setValue, formState} = useForm<ProcessValues>({defaultValues: processValues})
  const [useableMeters, setUsableMeters] = useState<Metering[]>([])
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [selectEntire, setSelectEntire] = useState(false)
  const [smart, setSmart] = useState(true)
  const [checking, setChecking] = useState(false)
  const [meteringPoints, participantId] = watch(['meteringPoints', 'participantId'])

  // useEffect(() => {
  //   if (!participantId) {
  //     if (meteringPoint) {
  //       const p = participants.find(p => p.meters.find(m => m.meteringPoint === meteringPoint))
  //       if (p) {
  //         setValue('participantId', p.id)
  //       }
  //     }
  //   }
  // }, [meteringPoints])

  useEffect(() => {
    if (participantId) {
      const p = participants.find(p=> p.id === participantId)
      if (p) {
        setUsableMeters(p.meters)
      }
    } else {
      setUsableMeters(meters)
    }
  }, [participantId])

  // resolves with the role of the chosen button; the submit stays running (button disabled) until then
  const ask = (message: string, buttons: { text: string, role: string }[]) => new Promise<string | undefined>(resolve =>
    alert({
      subHeader: edaProcess.name, message,
      buttons: [{text: "Abbrechen", role: "cancel"}, ...buttons],
      onDidDismiss: (e: CustomEvent) => resolve(e.detail.role),
    }))

  const send = (request: SyncEnergyMeter[], complete: string[], start: Date, end: Date, note?: string) =>
    Api.eegService.syncMeteringPoint(eeg.id.toUpperCase(), request, start.getTime(), end.getTime(), complete)
      .then((r: SyncEnergyResult) => {
        const feedback = sendFeedback(r, note)
        if (feedback.kind === 'info') {
          info(feedback.text!)
        } else {
          sent(feedback.text)
        }
        reset()
        setDateRange([null, null])
        setSelectEntire(false)
      })
      .catch(failed)  // keep the input on failure

  // Smart: check the energy data first, request only the metering points with gaps or L3 values, each over those days
  const requestSmart = async (meter: Metering[], from: Date, until: Date) => {
    const period = smartPeriod(from, until)
    if (!period) {
      info(NOTHING_BEFORE_TODAY)
      return
    }
    const {start, end, capped} = period
    const toCheck = metersToCheck(meter.map(m => m.meteringPoint), meters, start, end)
    if (toCheck.length === 0) {
      info(NOTHING_TO_CHECK)
      return
    }
    setChecking(true)
    const plan = await Api.energyService.fetchBillingCheck(tenant, buildBillingCheckRequest(toCheck, start, end))
      .then(res => smartPlan(toCheck, res))
      .catch(() => smartPlan(toCheck, {error: "Energiedaten konnten nicht abgefragt werden."}))
      .finally(() => setChecking(false))
    const confirmation = smartConfirmation(plan, capped ? end : undefined)
    if (!confirmation) {
      info(capped ? `${NOTHING_MISSING} ${cappedNote(end)}` : NOTHING_MISSING)
      return
    }
    const choice = await ask(confirmation.message, confirmation.buttons)
    if (choice === 'missing' || choice === 'all') {
      const {meters: request, complete, note} = smartRequest(plan, choice)
      return send(request, complete, start, end, note)
    }
  }

  const onRequest = async (data: ProcessValues) => {
    if (data.meteringPoints && startDate && endDate) {

      // „Gesamte Gemeinschaft“ fills the selection from all meters and keeps an earlier participant choice
      const meter = selectedMeters(selectEntire ? meters : useableMeters, data.meteringPoints)
      if (meter.length > 0) {  // empty: the selection does not belong to the chosen participant
        if (smart) {
          return requestSmart(meter, startDate, endDate)
        }
        if (selectEntire && await ask(entireConfirmation(meter.length), [{text: "Anfordern", role: "confirm"}]) !== "confirm") {
          return
        }
        return send(meter.map(m => {return {meter: m.meteringPoint, direction: m.direction}}), [], startDate, endDate)
      }
    }
  }

  const Component = forwardRef<HTMLIonInputElement, {}>(function CustomInput(p, ref) {
    return (
      <IonInput
        {...p}
        label={t("button_labels.calendar")}
        placeholder="Datum wählen"
        fill="outline"
        labelPlacement={"floating"}
        ref={ref}
      >
      </IonInput>
    );
  });

  const selectAllMeteringPoints = (s: boolean) => {
    if (s) {
      setValue("meteringPoints", meters.map(m => {
        return m.meteringPoint
      }), {shouldValidate: false, shouldDirty: true})
    } else {
      reset()
    }
    setSelectEntire(s)
  }

  return (
    <>
      <ProcessHeaderComponent name={edaProcess.name} />
      <ProcessContentComponent>
        <CorePageTemplate>
          <>
            <InputForm name="communityId" label={t("common-info.community-id")} control={control} protectedControl={true}/>
            <CheckboxComponent label={t("process.requestValue.selectEntire")} setChecked={(c) => selectAllMeteringPoints(c)}
                               checked={selectEntire!}/>
            <CheckboxComponent label="Nur fehlende Daten oder L3-Werte anfordern (Smart)" setChecked={setSmart} checked={smart}/>
            <BasicSelectComponent control={control} name={"participantId"}
                                  options={participants
                                    .sort((a,b) => a.lastname && b.lastname ? a.lastname.localeCompare(b.lastname) : a.firstname.localeCompare(b.firstname))
                                    .map((p) => {
                                    return {value: p.id, label: JoinStrings(" ", "-", p.participantNumber, (p.lastname ? p.lastname : ""), p.firstname)} as SelectOptions
                                  })} label={t("participant")} disabled={selectEntire}/>
            <BasicSelectComponent control={control} name={"meteringPoints"}
                                  options={useableMeters.filter(p => p.processState === 'ACTIVE' || p.processState == 'INACTIVE').map((p) => {
                                    return {value: p.meteringPoint, label: requestValuesMeterLabel(p, t)}
                                  })} label={t("metering")} multiple={true} rules={{required: true}} disabled={selectEntire}/>
            <div className="form-element">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  setDateRange(update);
                }}
                customInput={<Component/>}
                dateFormat={DATE_PICKER_FORMAT}
                locale={DATE_PICKER_LOCALE}
              />
            </div>
            <IonItem lines="none" style={{zIndex: "0"}}>
              <IonButton slot="end" onClick={handleSubmit(onRequest)} disabled={((!formState.isValid && !selectEntire) || !startDate || !endDate || formState.isSubmitting)}>
                {t("process.submit")}
              </IonButton>
            </IonItem>
            {checking && <p style={{paddingLeft: "16px"}}>Datenstand wird geprüft …</p>}
          </>
      </CorePageTemplate>
      </ProcessContentComponent>
    </>
  )
}

export default ProcessRequestValuesComponent