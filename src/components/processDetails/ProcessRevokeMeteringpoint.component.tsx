import React, {FC, forwardRef, useEffect, useState} from "react";
import {IonButton, IonContent, IonInput, IonItem, useIonToast} from "@ionic/react";
import InputForm from "../form/InputForm.component";
import SelectForm from "../form/SelectForm.component";
import DatePicker from "react-datepicker";
import {useForm} from "react-hook-form";
import {Metering} from "../../models/meteringpoint.model";
import {EdaProcess, Eeg} from "../../models/eeg.model";
import {EegParticipant} from "../../models/members.model";
import CorePageTemplate from "../core/CorePage.template";
import ProcessHeaderComponent from "./ProcessHeader.component";
import ProcessContentComponent from "./ProcessContent.component";
import {BasicSelectComponent, SelectOptions} from "../form/BasicSelect.component";
import {Api} from "../../service";
import {meteringDisplayName} from "../../util/FilterHelper";
import {useLocale} from "../../store/hook/useLocale";
import {JoinStrings} from "../../util/Helper.util";
import moment from "moment";

interface ProcessValues {
  communityId: string | undefined
  participantId: string | undefined
  meteringPoints: string[] | undefined
  reason: string | undefined
}
interface ProcessRevokeMeteringpointComponentProps {
  eeg: Eeg
  meters: Metering[]
  participants: EegParticipant[]
  edaProcess: EdaProcess
}

const ProcessRevokeMeteringpointComponent: FC<ProcessRevokeMeteringpointComponentProps> = ({eeg, meters, participants, edaProcess}) => {
  const processValues = {
    communityId: eeg.communityId,
    participantId: undefined,
    meteringPoints: undefined,
    reason: undefined,
  }

  const {t} = useLocale("common")
  const {t: errorT} = useLocale("error")

  const {handleSubmit, reset,
    control, watch,
    setValue, formState} = useForm<ProcessValues>({defaultValues: processValues})
  const [useableMeters, setUsableMeters] = useState<Metering[]>([])
  const [consentEndDate, setConsentEndDate] = useState<Date|null>(null);
  const [reason, setReason] = useState<string|undefined>()
  const [meteringPoints, participantId] = watch(['meteringPoints', 'participantId'])

  const [toaster] = useIonToast();

  const infoToast = (message: string) => {
    toaster({
      message: message,
      duration: 3500,
      position: "bottom",
    });
  };

  const errorToast = (message: string) => {
    toaster({
      message: message,
      duration: 25500,
      position: "bottom",
      color: "danger",
      buttons: [{text: "OK"}],
    });
  };

  useEffect(() => {
    if (participantId) {
      const p = participants.find(p=> p.id === participantId)
      if (p) {
        setUsableMeters(p.meters)
      }
    } else {
      setUsableMeters([])
    }
  }, [participantId])

  const onRequest = (data: ProcessValues) => {
    if (data.participantId && data.meteringPoints && consentEndDate) {

      const meter = meters.filter((m) => data.meteringPoints?.find((s:string) => s === m.meteringPoint))
      if (meter) {
        if (meter.filter(m => !(m.consentId && m.consentId.length > 0)).length === 0) {
          Api.eegService.revokeMeteringPoint(
            eeg.id.toUpperCase(), data.participantId,
            meter.map(m => {return {meter: m.meteringPoint, direction: m.direction, consentId: m.consentId}}),
            consentEndDate.getTime(), reason)
            .finally(() => {
              reset()
              setConsentEndDate(null)
            })
        } else {
          errorToast(errorT("process.revoke_consentIdEmpty"))
        }
      }
    }
  }

  const Component = forwardRef<HTMLIonInputElement, {}>(function CustomInput(p, ref) {
    return (
      <IonInput
        {...p}
        label={t("button_labels.calendar")}
        placeholder="Enter text"
        fill="outline"
        labelPlacement={"floating"}
        ref={ref}
      >
      </IonInput>
    );
  });

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
              return {value: p.id, label: JoinStrings(" ", " - ", p.participantNumber, (p.lastname ? p.lastname : ""), p.firstname)} as SelectOptions
            })} label={t("participant")} rules={{required: true}}/>
            <SelectForm control={control} name={"meteringPoints"} options={useableMeters.map((p) => {
              return {key: p.meteringPoint, value: meteringDisplayName(p)}
            })} label={t("metering")} selectInterface={"popover"} multiple={true} rules={{required: true}}/>
            <InputForm name="reason" label={t("process.revokeMeter.reason")} control={control}/>
            <div className="form-element">
              <DatePicker
                selectsRange={false}
                selected={consentEndDate}
                onChange={(update) => {
                  setConsentEndDate(update);
                }}
                customInput={<Component/>}
                minDate={moment(Date.now()).add(1, 'day').toDate()}
              />
            </div>
            <IonItem lines="none" style={{zIndex: "0"}}>
              <IonButton slot="end" onClick={handleSubmit(onRequest)} disabled={(!formState.isValid || !consentEndDate)}>
                {t("process.submit")}
              </IonButton>
            </IonItem>
          </>
      </CorePageTemplate>
      </ProcessContentComponent>
    </>
  )
}

export default ProcessRevokeMeteringpointComponent