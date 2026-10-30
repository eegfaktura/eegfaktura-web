import React, {FC, useContext, useEffect} from "react";
import CorePageTemplate from "../core/CorePage.template";
import {Metering, ParticipantState} from "../../models/meteringpoint.model";
import EegWebContentPaneComponent from "../EegWebContentPane.component";
import {IonButton, IonFooter, IonToolbar} from "@ionic/react";
import {ParticipantContext, useReportUnsaved} from "../../store/hook/ParticipantProvider";
import EegPaneTemplate from "../core/EegPane.template";
import MeterFormElement from "../core/MeterForm.element";
import {FormProvider, useForm} from "react-hook-form";
import {registerMeteringpoint, selectedParticipantSelector} from "../../store/participant";
import {useAppDispatch, useAppSelector} from "../../store";
import {ratesSelector} from "../../store/rate";
import {selectedTenant} from "../../store/eeg";
import MeterAddressFormElement from "../core/forms/MeterAddressForm/MeterAddressForm.element";
import {useOnlineState, useTenant} from "../../store/hook/Eeg.provider";
import moment from "moment";
import UnsavedChangesGuard, {useConfirmDiscard} from "../core/UnsavedChangesGuard.component";

const AddMeterPaneComponent: FC = () => {

  const dispatcher = useAppDispatch()
  const rates = useAppSelector(ratesSelector);
  const {tenant} = useTenant()
  const participant = useAppSelector(selectedParticipantSelector);

  const isOnline = useOnlineState()

  const meter = {
    status: isOnline ? "INIT" : "ACTIVE",
    processState: isOnline ? "NEW" : "ACTIVE",
    participantId: "",
    meteringPoint: "",
    direction: "CONSUMPTION",
    registeredSince: moment.utc().toDate(),
    // participantState: {activeSince: new Date(Date.now()), inactiveSince: moment.utc([2999, 11, 31]).toDate()} as ParticipantState,
    activationMode: 'ONLINE'
  } as Metering

  const formMethods = useForm<Metering>({mode: 'onBlur', defaultValues: meter});
  const {handleSubmit, control, watch, setValue, formState: {errors, isDirty, isValid}, reset} = formMethods

  const {
    setShowAddMeterPane,
  } = useContext(ParticipantContext);
  const confirmDiscard = useConfirmDiscard()

  // the member list asks before another member replaces unsaved input (platform#228 step 4)
  useReportUnsaved("addMeter", isDirty)

  useEffect(() => {
    reset(meter)
    // setShowAddMeterPane(false);
  }, [participant])

  const onChancel = () => confirmDiscard(isDirty, () => {
    reset(meter)
    setShowAddMeterPane(false);
  })

  const onSubmit = (meter: Metering) => {
    if (isDirty && participant) {
      let participantId = participant.id;
      meter.participantId = participantId

      // close only after the save worked; on failure the input stays (error toast: store middleware)
      dispatcher(registerMeteringpoint({tenant, participantId, meter}))
        .unwrap()
        .then(() => {
          reset(meter);
          setShowAddMeterPane(false);
        })
        .catch(() => {})
    }
  }
  return (
    <EegWebContentPaneComponent>
      <UnsavedChangesGuard dirty={isDirty}/>
      <CorePageTemplate>
        <form id="submit-register-meter" onSubmit={handleSubmit((data) => onSubmit(data))}>
          <EegPaneTemplate>
            <FormProvider {...formMethods}>
              <MeterFormElement rates={rates} participant={participant}/>
              <MeterAddressFormElement participant={participant} isEditable={true} isOnline={isOnline} showActivationMode={true}/>
            </FormProvider>
          </EegPaneTemplate>
        </form>
      </CorePageTemplate>
      <IonFooter>
        <IonToolbar className={"ion-padding-horizontal"}>
          <IonButton fill="clear" slot="start" onClick={onChancel}>Zurück</IonButton>
          <IonButton form="submit-register-meter" type="submit" slot="end" disabled={!isDirty || !isValid}>Registrieren</IonButton>
        </IonToolbar>
      </IonFooter>
    </EegWebContentPaneComponent>
  )
}

export default AddMeterPaneComponent;