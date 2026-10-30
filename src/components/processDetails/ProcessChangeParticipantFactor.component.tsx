import React, {FC, useEffect, useState} from "react";
import ProcessHeaderComponent from "./ProcessHeader.component";
import ProcessContentComponent from "./ProcessContent.component";
import CorePageTemplate from "../core/CorePage.template";
import InputForm from "../form/InputForm.component";
import {BasicSelectComponent} from "../form/BasicSelect.component";
import {IonButton, IonIcon, IonItem, IonLabel} from "@ionic/react";
import {informationCircleOutline, warning} from "ionicons/icons";
import {EdaProcess, Eeg} from "../../models/eeg.model";
import {Metering, MeteringProcessStateType} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import {useForm} from "react-hook-form";
import {FilterByMeterState, meteringDisplayName, selectedMeters} from "../../util/FilterHelper";
import {Api} from "../../service";
import {useLocale} from "../../store/hook/useLocale";
import {JoinStrings} from "../../util/Helper.util";
import {TFunction} from "i18next";
import {isInPartFactWindow, PARTFACT_WINDOW_TEXT} from "../../util/PartFactWindow.util";
import {useProcessFeedback} from "./useProcessFeedback";
import {useConfirm} from "../core/useConfirm";
import {partFactSummary} from "./ProcessConfirm.functions";

// 0 would have been sent as 100 % (`|| 100`); the factor is 1–100 like in the meter form
const PARTFACT_RANGE = {value: 1, message: "Der Teilnahmefaktor muss zwischen 1 und 100 % liegen."}
const PARTFACT_RANGE_MAX = {value: 100, message: PARTFACT_RANGE.message}

export const partFactMeterLabel = (m: Metering, t: TFunction) => meteringDisplayName(m, t) + ' - ' + m.partFact + '%'

export const partFactChanges = (meters: Metering[], partFact: number) =>
  meters.map(m => ({meter: m.meteringPoint, direction: m.direction, gridOperatorId: m.gridOperatorId,
    activation: m.participantState.activeSince, partFact}))

interface ProcessValues {
  communityId: string | undefined
  participantId: string | undefined
  meteringPoints: string[] | undefined
  partFact: number | undefined
}

interface ProcessChangeParticipantFactorComponentProps {
  eeg: Eeg
  meters: Metering[]
  participants: EegParticipant[]
  edaProcess: EdaProcess
}

const ProcessChangeParticipantFactorComponent: FC<ProcessChangeParticipantFactorComponentProps> = ({eeg, meters, participants, edaProcess}) => {
  const [useableMeters, setUsableMeters] = useState<Metering[]>([])
  const [participant, setParticipant] = useState<EegParticipant>()
  const {t} = useLocale("common")
  const {sent, failed} = useProcessFeedback()
  const confirm = useConfirm()
  const [inWindow, setInWindow] = useState(isInPartFactWindow)

  useEffect(() => {
    // the page stays mounted: re-check the time window every minute
    const timer = setInterval(() => setInWindow(isInPartFactWindow()), 60_000)
    return () => clearInterval(timer)
  }, []);

  const processValues = {
    communityId: eeg.communityId,
    participantId: undefined,
    meteringPoints: undefined,
    partFact: undefined,
  } as ProcessValues

  const {handleSubmit, reset,
    control, watch,
    setValue, formState} = useForm<ProcessValues>({defaultValues: processValues})

  const [participantId] = watch(['participantId'])

  useEffect(() => {
    const statusPattern:MeteringProcessStateType[] = ['ACTIVE']
    if (participantId) {
      const p = participants.find(p=> p.id === participantId)
      if (p) {
        setUsableMeters(FilterByMeterState(p.meters, statusPattern))
      } else {
        setUsableMeters(FilterByMeterState(meters, statusPattern))
      }
    } else {
      setUsableMeters(FilterByMeterState(meters, statusPattern))
    }
  }, [participantId]);

  const onRequest = async (data: ProcessValues) => {
    if (inWindow && !isInPartFactWindow()) {
      // the window closed since the last check: show the warning first, a second click sends anyway
      setInWindow(false)
      return
    }
    if (data.meteringPoints && data.partFact) {  // partFact: 1–100, enforced by the form rule
      const meter =
        selectedMeters(useableMeters, data.meteringPoints)
      if (meter.length > 0) {  // empty: the selection does not belong to the chosen participant
        // goes to the grid operator: ask first; the submit button stays disabled while the dialog is open
        if (!await confirm(edaProcess.name, partFactSummary(meter, data.partFact), "Senden")) return
        if (inWindow && !isInPartFactWindow()) {
          // the window closed while the dialog was open (the grid operator would answer 82): warn, send nothing
          setInWindow(false)
          return
        }
        return Api.eegService.changeMeterPartitionFactor(
          eeg.id.toUpperCase(),
          partFactChanges(meter, data.partFact))
          .then(() => {
            sent()
            reset()
          })
          .catch(failed)  // keep the input on failure
      }
    }
  }

  return (
    <>
      <ProcessHeaderComponent name={edaProcess.name} />
      <ProcessContentComponent>
        <CorePageTemplate>
          <>
            <InputForm name="communityId" label={t("common-info.community-id")} control={control} protectedControl={true}/>
            <BasicSelectComponent control={control} name={"participantId"}
                                  options={participants
                                    .sort((a,b) => a.lastname && b.lastname ? a.lastname.localeCompare(b.lastname) : a.firstname.localeCompare(b.firstname))
                                    .map((p) => {
                                    return {value: p.id, label: JoinStrings(" ", "-", p.participantNumber, (p.lastname ? p.lastname : ""), p.firstname)}
                                  })} label={t("participant")}/>
            <BasicSelectComponent control={control} name={"meteringPoints"}
                                  options={useableMeters.map((p) => {
                                    return {value: p.meteringPoint, label: partFactMeterLabel(p, t)}
                                  })} label={t("metering")} multiple={true} rules={{required: true}}/>
            <InputForm name="partFact" label={t("process.partFact.label")}
                       control={control} rules={{required: true, min: PARTFACT_RANGE, max: PARTFACT_RANGE_MAX}}
                       type={"number"} pattern={"^([1-9]|[1-9][0-9]|100)$"} maxlength={3} isNumber={true}/>
            <IonItem lines="none">
              <IonIcon slot="start" icon={informationCircleOutline}/>
              <IonLabel className="ion-text-wrap">
                Der Netzbetreiber nimmt Änderungen des Teilnahmefaktors nur zwischen {PARTFACT_WINDOW_TEXT} an. Die
                Änderung gilt ab dem nächsten Tag.
              </IonLabel>
            </IonItem>
            {!inWindow && (
              <IonItem color="warning" lines="none">
                <IonIcon slot="start" icon={warning}/>
                <IonLabel className="ion-text-wrap">
                  Es ist gerade außerhalb dieser Zeit. Wenn Du jetzt anforderst, lehnt der Netzbetreiber die Änderung
                  ab („Prozessdatum falsch“). Bitte fordere sie zwischen {PARTFACT_WINDOW_TEXT} an.
                </IonLabel>
              </IonItem>
            )}
            <IonItem lines="none" style={{zIndex: "0"}}>
              <IonButton slot="end" onClick={handleSubmit(onRequest)} disabled={!formState.isValid || formState.isSubmitting}>
                Anfordern
              </IonButton>
            </IonItem>
          </>
        </CorePageTemplate>
      </ProcessContentComponent>
    </>
  )
}

export default ProcessChangeParticipantFactorComponent