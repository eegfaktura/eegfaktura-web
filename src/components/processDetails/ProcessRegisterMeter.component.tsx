import React, {FC, useEffect, useRef, useState} from "react";
import {IonButton, IonItem} from "@ionic/react";
import moment from "moment";
import InputForm from "../form/InputForm.component";
import {useForm} from "react-hook-form";
import {Metering} from "../../models/meteringpoint.model";
import {EdaProcess, Eeg} from "../../models/eeg.model";
import {EegParticipant} from "../../models/members.model";
import CorePageTemplate from "../core/CorePage.template";
import ProcessHeaderComponent from "./ProcessHeader.component";
import ProcessContentComponent from "./ProcessContent.component";
import {Api} from "../../service";
import {BasicSelectComponent} from "../form/BasicSelect.component";
import {JoinStrings} from "../../util/Helper.util";
import {meteringDisplayName} from "../../util/FilterHelper";
import {TFunction} from "i18next";
import {useLocale} from "../../store/hook/useLocale";
import {useProcessFeedback} from "./useProcessFeedback";
import {useConfirm} from "../core/useConfirm";
import {registerSummary} from "./ProcessConfirm.functions";
import DatePickerFormElement from "../form/DatePickerForm.element";
import {registrationDateError, tomorrowDay, useRegistrationWindow} from "../form/useRegistrationWindow.hook";

interface ProcessValues {
  communityId: string | undefined
  participantId: string | undefined
  meteringPoint: string | undefined
  // „Aktiv ab“: the day the registration starts, stored at the metering point (platform#272), "YYYY-MM-DD"
  registrationDate: string | undefined
}

interface ProcessRegisterMeterComponentProps {
  eeg: Eeg
  meters: Metering[]
  participants: EegParticipant[]
  edaProcess: EdaProcess
}

export const registerMeterLabel = (m: Metering, t: TFunction) => JoinStrings(" ", "", meteringDisplayName(m, t), m.processState)

const ProcessRegisterMeterComponent: FC<ProcessRegisterMeterComponentProps> = ({
                                                                                 eeg,
                                                                                 meters,
                                                                                 participants,
                                                                                 edaProcess
                                                                               }) => {
  const processValues = {
    communityId: eeg.communityId,
    participantId: undefined,
    meteringPoint: undefined,
    registrationDate: undefined,
  }

  const {t} = useLocale("common")
  const {sent, failed} = useProcessFeedback()
  const confirm = useConfirm()
  const {
    handleSubmit, reset,
    control, watch,
    setValue, formState, trigger
  } = useForm<ProcessValues>({defaultValues: processValues, mode: "onChange"})
  const [useableMeters, setUsableMeters] = useState<Metering[]>(meters)
  const [meteringPoint, participantId] = watch(['meteringPoint', 'participantId'])

  // After an owner change one metering point number is at two members (the old one inactive): the request goes to the
  // member chosen in the form (required). Choosing a metering point first fills the member only when one member holds
  // it; choosing another member clears a metering point it does not hold. Before, the first member by number was
  // taken, which could be the old owner (bug 08.11.2026).
  const holders = (mp: string) => participants.filter(p => p.meters.some(m => m.meteringPoint === mp))
  const chosenMeter = participants.find(p => p.id === participantId)?.meters.find(m => m.meteringPoint === meteringPoint)

  const registrationWindow = useRegistrationWindow(eeg.id.toUpperCase(), true)
  // the rules read the window of the latest render
  const windowRef = useRef(registrationWindow)
  windowRef.current = registrationWindow
  const day = (d: Date) => moment(d).format("DD.MM.YYYY")
  const validateRegistrationDate = (value: string | undefined) => {
    const w = windowRef.current
    switch (registrationDateError(value, w)) {
      case "before": return t("meteringPoint-active-since_before", {date: day(w.from)})
      case "after": return t("meteringPoint-active-since_after", {date: day(w.to!)})
      default: return !!value
    }
  }
  // the window can arrive after the day was filled in
  useEffect(() => {
    if (chosenMeter) trigger('registrationDate')
  }, [registrationWindow])

  // the field shows the day stored at the chosen metering point; a day already past counts as tomorrow
  useEffect(() => {
    if (!chosenMeter) {
      setValue('registrationDate', undefined)
      return
    }
    const stored = chosenMeter.registeredSince ? moment(chosenMeter.registeredSince) : undefined
    setValue('registrationDate', stored && !stored.isBefore(moment().add(1, "day"), "day")
      ? stored.format("YYYY-MM-DD") : tomorrowDay(), {shouldValidate: true})
  }, [chosenMeter])

  useEffect(() => {
    if (meteringPoint && !participantId) {
      const all = holders(meteringPoint)
      if (all.length === 1) {
        setValue('participantId', all[0].id)
      }
    }
  }, [meteringPoint])

  useEffect(() => {
    if (participantId) {
      const p = participants.find(p => p.id === participantId)
      if (p) {
        setUsableMeters(p.meters)
        // another member: a metering point it does not hold no longer counts
        if (meteringPoint && !p.meters.some(m => m.meteringPoint === meteringPoint)) {
          setValue('meteringPoint', undefined, {shouldValidate: true})
        }
      }
    } else {
      setUsableMeters(meters)
    }
  }, [participantId])

  const onRequest = async (data: ProcessValues) => {
    if (data.meteringPoint) {
      const p = participants.find(p => p.id === data.participantId)
      const meter = p?.meters.find(m => m.meteringPoint === data.meteringPoint)
      if (p && meter) {
        // goes to the grid operator: ask first; the submit button stays disabled while the dialog is open
        const member = JoinStrings(" ", "-", p.participantNumber, (p.lastname ? p.lastname : ""), p.firstname)
        if (!await confirm(edaProcess.name, registerSummary(data.meteringPoint, member), "Senden")) return
        return Api.eegService.registerMeteringPoint(eeg.id.toUpperCase(), p.id, data.meteringPoint, meter.direction,
          moment(data.registrationDate, "YYYY-MM-DD").toDate())
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
      <ProcessHeaderComponent name={edaProcess.name}/>
      <ProcessContentComponent>
        <CorePageTemplate>
          <>
            <InputForm name="communityId" label={t("common-info.community-id")} control={control} protectedControl={true}/>
            {/*<SelectForm control={control} name={"participantId"} options={participants.map((p) => {*/}
            {/*  return {key: p.id, value: p.firstname + " " + p.lastname}*/}
            {/*})} label={"Mitglied"} selectInterface={"popover"} rules={{required: true}}/>*/}
            {/*<SelectForm control={control} name={"meteringPoint"} options={useableMeters.map((p) => {*/}
            {/*  return {key: p.meteringPoint, value: p.meteringPoint + " (" + p.equipmentName + ")"}*/}
            {/*})} label={"Zählpunkt"} selectInterface={"popover"}  rules={{required: true}}/>*/}

            <BasicSelectComponent control={control} name={"participantId"}
                                  options={[...participants]
                                    .sort((a, b) => a.lastname && b.lastname ? a.lastname.localeCompare(b.lastname) : a.firstname.localeCompare(b.firstname))
                                    .map((p) => {
                                    return {
                                      value: p.id,
                                      label: JoinStrings(" ", "-", p.participantNumber, (p.lastname ? p.lastname : ""), p.firstname)
                                    }
                                  })} label={t("participant")} rules={{required: true}}/>
            <BasicSelectComponent control={control} name={"meteringPoint"}
                                  options={useableMeters.filter(p => p.processState !== 'ACTIVE' /*&& p.status !== 'APPROVED' && p.status !== 'PENDING'*/)
                                    // without a chosen member a moved metering point is listed once
                                    .filter((m, i, all) => all.findIndex(o => o.meteringPoint === m.meteringPoint) === i)
                                    .map((p) => {
                                    return {
                                      value: p.meteringPoint,
                                      label: registerMeterLabel(p, t)
                                    }
                                  })} label={t("metering")} rules={{required: true}}/>
            {chosenMeter &&
              <DatePickerFormElement control={control} name={"registrationDate"} label={t("meteringPoint-active-since")}
                                     placeholder={t("date")} error={formState.errors.registrationDate}
                                     rules={{validate: validateRegistrationDate}}
                                     minDate={registrationWindow.from} maxDate={registrationWindow.to}
                                     hint={t("meteringPoint-active-since_hint")}/>}

            <IonItem lines="none" style={{zIndex: "0"}}>
              <IonButton slot="end" onClick={handleSubmit(onRequest)} disabled={!formState.isValid || formState.isSubmitting}>
                {t("process.submit")}
              </IonButton>
            </IonItem>
          </>
        </CorePageTemplate>
      </ProcessContentComponent>
    </>
  )
}

export default ProcessRegisterMeterComponent