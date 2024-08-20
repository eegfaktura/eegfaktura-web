import React, {FC, useEffect, useState} from "react";
import {IonCheckboxCustomEvent} from "@ionic/core/dist/types/components";
import {CheckboxChangeEventDetail} from "@ionic/core";
import {IonCheckbox, IonInput, IonItem} from "@ionic/react";
import SliderElement from "./Slider.element";
import {Metering} from "../../../models/meteringpoint.model";

import "./MeteringPointOffline.element.scss"

const MeteringPointOfflineElement: FC<{m: Metering}> = ({m}) => {
  const [enabled, setEnabled] = useState<boolean>(m.enabled)
  const [mode, setMode] = useState<'ONLINE' | 'OFFLINE'>(m.activationMode)

  useEffect(() => {
    setEnabled(m.enabled)
    setMode(m.activationMode)
    m.activationCode = ''
  }, [m])

  console.log("ACt METER: ", m, enabled)

  const onActivationModeChanged = (v: number) => {
    m.activationMode = v === 1 ? 'ONLINE' : 'OFFLINE'
    console.log('onActivationModeChanged', m.activationMode)
    setMode(m.activationMode)
  }

  const onChangeEnabled = (v: IonCheckboxCustomEvent<CheckboxChangeEventDetail<any>>) => {
    m.enabled = v.target.checked
    console.log('onChangeEnabled', m.enabled)
    setEnabled(m.enabled)
  }

  const onActivationCodeChanged = (code: string) => {
    m.activationCode = code
  }

  return (
    <div className="box meter">
      <div style={{display: "flex", justifyContent: "space-between", flexFlow: "row", alignItems: "center"}}>
        <IonCheckbox style={{paddingRight: "8px"}} labelPlacement="end" checked={enabled} onIonChange={onChangeEnabled}>{m.meteringPoint}</IonCheckbox>
        {/*<div>{m.meteringPoint}</div>*/}
        <SliderElement online={mode === 'ONLINE' ? 1 : 0} onSlide={onActivationModeChanged}/>
        {/*<div style={{display: "flex", justifyContent: "space-between", flexFlow: "column", alignItems: "center"}}>*/}
        {/*<ToggleButtonComponent*/}
        {/*  buttons={[{label: "offline"}, {label: "später"}]}*/}
        {/*  onChange={() => console.log("change")}*/}
        {/*  value={1}*/}
        {/*  changeable={true}*/}
        {/*!/>*/}
        {/*</div>*/}
        {/*<div>*/}
        {/*  <IonRadioGroup value="end">*/}
        {/*    <IonRadio value="offline" labelPlacement="end">Offline</IonRadio>*/}
        {/*    <IonRadio value="later" labelPlacement="end">Später</IonRadio>*/}
        {/*  </IonRadioGroup>*/}
        {/*</div>*/}
      </div>
      { enabled && mode === 'OFFLINE' &&
        (<div>
          <IonItem lines="none">
            <IonInput labelPlacement="floating"
                      label="Aktivierungs Code"
                      onIonChange={(e) => onActivationCodeChanged(e.target.value as string)}
                      counter={true} maxlength={35}></IonInput>
          </IonItem>
        </div>)
      }
    </div>
  )
}
export default MeteringPointOfflineElement
