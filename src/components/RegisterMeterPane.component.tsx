import React, {FC, useMemo} from "react";
import {Metering} from "../models/meteringpoint.model";
import {IonButton, IonFooter, IonToolbar} from "@ionic/react";
import {FormProvider, useForm, useFormContext} from "react-hook-form";
import {useAppSelector} from "../store";
import {ratesSelector} from "../store/rate";
import {EegParticipant} from "../models/members.model";
import MeterFormElement from "./core/MeterForm.element";
import MeterAddressFormElement from "./core/forms/MeterAddressForm/MeterAddressForm.element";
import {useOnlineState} from "../store/hook/Eeg.provider";
import {useConfirmDiscard, useReportDirty} from "./core/UnsavedChangesGuard.component";

interface RegisterMeterPaneComponentProps {
  meteringPoint: Metering
  onAdd: (meter: Metering) => void
  onChancel: () => void
  // reports unsaved input, so the register page asks before it is lost (platform#228 step 4)
  onDirtyChange?: (dirty: boolean) => void
}

const RegisterMeterPaneComponent: FC<RegisterMeterPaneComponentProps> = ({
                                                                           meteringPoint,
                                                                           onAdd,
                                                                           onChancel,
                                                                           onDirtyChange
                                                                         }) => {

  const rates = useAppSelector(ratesSelector);
  const formMethods = useForm({defaultValues: meteringPoint})
  const {handleSubmit, setValue, control, watch, formState: {errors, isDirty}, clearErrors} = formMethods;
  const confirmDiscard = useConfirmDiscard()

  useReportDirty(isDirty, onDirtyChange)
  const isOnline = useOnlineState()

  const {getValues} = useFormContext<EegParticipant>();
  const participant = useMemo(() => getValues(), [getValues])

  const onAppend = (m: Metering) => {
    onAdd(m)
  }

  return (
    <div style={{display: "grid", gridTemplateColumns: "50% 50%", justifyContent: "space-between"}}>
      <FormProvider {...formMethods}>
        <div style={{flexGrow: "1", height: "100%"}}>
          <MeterFormElement rates={rates} participant={participant}/>
        </div>
        <div style={{flexGrow: "1", height: "100%"}}>
          <MeterAddressFormElement participant={participant} isOnline={isOnline} isEditable={true}/>
        </div>
      </FormProvider>
      <div style={{gridColumnStart: "1", gridColumnEnd: "3", display: "grid"}}>
        <IonFooter>
          <IonToolbar className={"ion-padding-horizontal"}>
            <IonButton fill="clear" slot="start" onClick={() => confirmDiscard(isDirty, onChancel)}>Abbrechen</IonButton>
            <IonButton slot="end" onClick={handleSubmit(onAppend)}>Hinzufügen</IonButton>
          </IonToolbar>
        </IonFooter>
      </div>
    </div>
  )
}

export default RegisterMeterPaneComponent;