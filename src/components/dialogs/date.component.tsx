import React, {FC, forwardRef, useRef, useState} from "react";
import DatePicker from "react-datepicker";
import {IonButton, IonIcon, IonInput, IonLabel, IonRow} from "@ionic/react";

import "react-datepicker/dist/react-datepicker.css";
import "./data.component.scss"
import {calendar} from "ionicons/icons";
import {DATE_PICKER_PROPS, formatDate} from "../../util/DateFormat.util";

interface DateComponentProps {
  initialDate: [Date|null, Date|null]
  range: (range: [Date|null, Date|null]) => void
}

const DateComponent: FC<DateComponentProps> = ({range, initialDate}) => {
  const [dateRange, setDateRange] = useState<[Date|null, Date|null]>(initialDate);
  const [startDate, endDate] = dateRange;

  const setRange = (newRange: [Date|null, Date|null]) => {
    setDateRange(newRange)
    range(newRange)
  }

  const DateInputComponent = forwardRef<HTMLIonButtonElement, any>(function CustomInput(p, ref) {
    return (
      <IonRow ref={ref} {...p} style={{alignItems:"center"}}>
        <div><span>{startDate && formatDate(startDate)}</span> - <span>{endDate && formatDate(endDate)}</span></div>
        <IonButton fill="clear" size="small">
          <IonIcon slot="icon-only" icon={calendar}/>
        </IonButton>
      </IonRow>
    );
  });

  return (
      <DatePicker
        showIcon={false}
        className={"ion-date-picker"}
        selectsRange={true}
        startDate={startDate}
        endDate={endDate}
        onChange={(update: [Date | null, Date | null]) => {
          setRange(update);
        }}
        customInput={
          <DateInputComponent/>
        }
        {...DATE_PICKER_PROPS}
        portalId="root-portal"
      />
  )
}

export default DateComponent;