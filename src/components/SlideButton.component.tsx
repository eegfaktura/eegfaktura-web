import React, {FC, useState} from "react";
import {IonIcon} from "@ionic/react";

import "./SlideButton.scss"
import {eegEuro} from "../eegIcons";

interface SlideButtonComponentProps {
  checked: boolean
  disabled: boolean
  title?: string
  setChecked: (s: boolean) => void
}

const SlideButtonComponent: FC<SlideButtonComponentProps> = ({checked,disabled, title, setChecked}) => {

  // const [isChecked, setIsChecked] = useState(checked);

  const changeCheckbox = (e: any) => {
    //    e.preventDefault();
    //    e.stopPropagation();
    setChecked(e.target.checked);
  };

  return (
    <label className={disabled ? "eeg-sliding-box disabled" : "eeg-sliding-box"} aria-disabled={disabled} title={title}>
      <input type="checkbox" checked={checked && !disabled} onChange={(e) => changeCheckbox(e)} disabled={disabled} aria-label={title}/>
      <div className="eeg-sliding-box-inner">
        <div>
          <span className="eeg-on">
            <IonIcon icon={eegEuro}/>
          </span>
          <span className="eeg-off">
            <IonIcon icon={eegEuro}/>
          </span>
        </div>
      </div>
      <i className="eeg-sliding-box-button"></i>
    </label>
  )
}

export default SlideButtonComponent;