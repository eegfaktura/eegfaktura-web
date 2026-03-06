import React, {FC, useEffect, useState} from "react";
import ProcessHeaderComponent from "./ProcessHeader.component";
import ProcessContentComponent from "./ProcessContent.component";
import CorePageTemplate from "../core/CorePage.template";
import InputForm from "../form/InputForm.component";
import {BasicSelectComponent} from "../form/BasicSelect.component";
import {IonButton, IonItem} from "@ionic/react";
import {EdaProcess, Eeg} from "../../models/eeg.model";
import {Metering, MeteringProcessStateType} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import {useForm} from "react-hook-form";
import {FilterByMeterState, meteringDisplayName} from "../../util/FilterHelper";
import {Api} from "../../service";
import {useLocale} from "../../store/hook/useLocale";
import {JoinStrings} from "../../util/Helper.util";

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

  const onRequest = (data: ProcessValues) => {
    if (data.meteringPoints) {
      const meter =
        meters.filter((m) => data.meteringPoints?.find((s: string) => s === m.meteringPoint))
      if (meter) {
        Api.eegService.changeMeterPartitionFactor(
          eeg.id.toUpperCase(),
          meter.map(m => {return {meter: m.meteringPoint, direction: m.direction, gridOperatorId: m.gridOperatorId, activation: m.participantState.activeSince, partFact: data.partFact || 100}}))
          .finally(() => {
            reset()
          })
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
                                    return {value: p.meteringPoint, label: meteringDisplayName(p) + ' - ' + p.partFact + '%'}
                                  })} label={t("metering")} multiple={true} rules={{required: true}}/>
            <InputForm name="partFact" label={t("process.partFact.label")}
                       control={control} rules={{required: true}} type={"number"} pattern={"^([0-9]|[1-9][0-9]|100)$"} maxlength={3} isNumber={true}/>
            <IonItem lines="none" style={{zIndex: "0"}}>
              <IonButton slot="end" onClick={handleSubmit(onRequest)} disabled={(!formState.isValid)}>
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