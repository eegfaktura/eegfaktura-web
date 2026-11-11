import React, {FC, useState} from "react";
import {IonButton, IonButtons} from "@ionic/react";

import "./ButtonGroup.component.css";

const ButtonGroup: FC<{buttons: {icon: JSX.Element, title?: string}[], onChange: (idx: number) => void}> = ({buttons, onChange}) => {

  const [buttonState, setButtonState] = useState(0)

  const onChangeButton = (index: number) => {
    let currentIdx = buttonState;

    if (currentIdx === index) currentIdx = 0
    else currentIdx = index

    onChange(currentIdx);
    setButtonState(currentIdx);
  }

  return(
    <IonButtons>
      <span className={"button-group"}>
      {buttons.map( (b, idx) => (
      <IonButton
        key={idx}
        className={"button-group-item" + (buttonState === idx + 1 ? " isActive" : "")}
        title={b.title}
        aria-label={b.title}
        onClick={(() => onChangeButton(idx+1))}>
        {b.icon}
      </IonButton>
      ))}
        </span>
    </IonButtons>
  )
}

export default ButtonGroup