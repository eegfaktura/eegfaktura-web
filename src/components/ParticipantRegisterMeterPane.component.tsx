import React, {FC, useEffect, useState} from "react";
import {IonCard, IonCardContent, IonCol, IonGrid, IonIcon, IonItem, IonLabel, IonRow, IonText} from "@ionic/react";
import {add} from "ionicons/icons";
import {EegParticipant} from "../models/members.model";
import MeterCardComponent from "./participantPane/MeterCard.component";
import {useFieldArray, useFormContext} from "react-hook-form";
import RegisterMeterPaneComponent from "./RegisterMeterPane.component";
import { Metering } from "../models/meteringpoint.model";
import {useEegArea, useGridOperator, useOnlineState} from "../store/hook/Eeg.provider";

interface ParticipantRegisterMeterPaneComponentProps {
  participant: EegParticipant;
  onAddMeter: (meter: Metering) => void
}

const ParticipantRegisterMeterPaneComponent: FC<ParticipantRegisterMeterPaneComponentProps> = ({participant}) => {

  const isOnline = useOnlineState()
  const {gridOperatorId, gridOperatorName} = useGridOperator()

  const defaultMeter =  {
    status: isOnline ? "INIT" : "ACTIVE",
    processState: isOnline ? "NEW" : "ACTIVE",
    participantId: "",
    meteringPoint: "",
    direction: "CONSUMPTION",
    registeredSince: isOnline ? new Date() : new Date(2024, 0, 1, 0, 0, 0, 0),
    gridOperatorName: gridOperatorName,
    gridOperatorId: gridOperatorId,
    partFact: 100,
  } as Metering

  const [addMeterPaneActive, setAddMeterPaneActive] = useState(false)
  const [meteringPoint, setMeteringPoint] = useState<Metering | undefined>()

  const { control, watch} = useFormContext<EegParticipant>();
  const {fields, append, update, remove} = useFieldArray<EegParticipant>({control, name: 'meters'})

  useEffect(() => {
    remove(0)
  }, [remove])

 const meters = watch("meters")

  const showMeter = (meter: Metering) => {
    setMeteringPoint(meter);
    setAddMeterPaneActive(true);
  }

  const appendMeter = (meter: Metering) => {
    setAddMeterPaneActive(false)
    const currentFieldIdx = fields.findIndex((m) => m.meteringPoint === meter.meteringPoint)
    if (currentFieldIdx >= 0) {
      update(currentFieldIdx, meter)
    } else {
      append(meter)
    }
    setMeteringPoint(undefined);
  }

  const removeMeter = () => {
    setAddMeterPaneActive(false);
    setMeteringPoint(undefined);
  }

  const allMeteringPoints = () => {
    if (meters === undefined || meters.length === 0) {
      return (
        <IonCard style={{boxShadow: "none", background: "rgba(43, 104, 96, 0.08)", color: "#005457"}}>
          <IonCardContent>
            <IonText>
              Jedes Mitglied benötigt mindestens einen Zählpunkt.
            </IonText>
          </IonCardContent>
        </IonCard>
      )
    }
    return fields.map((m) => (
      <MeterCardComponent key={m.id} participant={participant} meter={m} hideMeter={true} onSelect={() => showMeter(m)}/>
    ))
  }

  return (
    <div style={{
      background: "var(--ion-color-eeglight, #fff)",
      boxShadow: "0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2)",
      borderRadius: "4px"
    }}>
      <div style={{display: "flex", flexDirection: "column"}}>
        <div style={{flexGrow: 1}}>
          <IonGrid>
            <IonRow>
              <IonCol>
                {allMeteringPoints()}
              </IonCol>
            </IonRow>
            <IonRow class="ion-justify-content-end">
              <IonCol size="5">
                <IonItem button lines="none" onClick={() => showMeter({...defaultMeter})}>
                  <IonIcon icon={add}></IonIcon>
                  <IonLabel>Zählpunkt hinzufügen</IonLabel>
                </IonItem>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>
        <div style={{flexGrow: 1}}>
          {addMeterPaneActive && meteringPoint && <RegisterMeterPaneComponent meteringPoint={meteringPoint} onAdd={appendMeter} onChancel={removeMeter} />}
        </div>
      </div>
    </div>
  )
}

export default ParticipantRegisterMeterPaneComponent;