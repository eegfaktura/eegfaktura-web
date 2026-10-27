import React, {FC, forwardRef, useRef, useState} from "react";
import DatePicker from "react-datepicker";
import {IonButton, IonIcon, IonInput, IonLabel, IonRow} from "@ionic/react";

import "react-datepicker/dist/react-datepicker.css";
import "./data.component.scss"
import {calendar} from "ionicons/icons";
import moment from "moment";

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
        <div><span>{startDate && moment(startDate).format("DD.MM.YYYY")}</span> - <span>{endDate && moment(endDate).format("DD.MM.YYYY")}</span></div>
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
        dateFormat="dd.MMM yyyy"
        portalId="root-portal"
      />
  )
}

export default DateComponent;