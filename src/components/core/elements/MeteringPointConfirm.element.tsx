import React, {FC, useEffect, useState} from "react";
import {IonCheckboxCustomEvent} from "@ionic/core/dist/types/components";
import {CheckboxChangeEventDetail} from "@ionic/core";
import {IonCheckbox} from "@ionic/react";
import {Metering} from "../../../models/meteringpoint.model";

import "./MeteringPointConfirm.element.scss"

// one metering point in „zulassen“: only whether it is registered; registration is always online (decision 2026-10-30)
// onChange: the dialog keeps the selection itself; without it the selection is written into m
const MeteringPointConfirmElement: FC<{m: Metering, onChange?: (enabled: boolean) => void}> = ({m, onChange}) => {
  const [enabled, setEnabled] = useState<boolean>(m.enabled)

  useEffect(() => {
    setEnabled(m.enabled)
  }, [m])

  const onChangeEnabled = (v: IonCheckboxCustomEvent<CheckboxChangeEventDetail<any>>) => {
    if (onChange) onChange(v.target.checked)
    else m.enabled = v.target.checked
    setEnabled(v.target.checked)
  }

  return (
    <div className="box meter">
      <div style={{display: "flex", justifyContent: "space-between", flexFlow: "row", alignItems: "center"}}>
        <IonCheckbox style={{paddingRight: "8px"}} labelPlacement="end" checked={enabled} onIonChange={onChangeEnabled}>{m.meteringPoint}</IonCheckbox>
      </div>
    </div>
  )
}
export default MeteringPointConfirmElement
