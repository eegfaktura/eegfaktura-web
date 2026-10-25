import React, {FC, forwardRef, useState} from "react";
import {
  IonButton, IonCol,
  IonContent,
  IonGrid, IonInput, IonItem,
  IonLabel,
  IonRow,
} from "@ionic/react";
import DatePicker from "react-datepicker";

import "./upload.popover.scss"
import "react-datepicker/dist/react-datepicker.css";
import ToggleButtonComponent from "../ToggleButton.component";
import {people} from "ionicons/icons";
import {eegBusiness} from "../../eegIcons";

const DatepickerPopover: FC<{
  tenant: string,
  onDismiss: (type: number, startDate: Date, endDate: Date) => void
}> = ({tenant, onDismiss}) => {

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [selectedExportType, setSelectedExportType] = useState(0)

  const onOk = () => {
    if (selectedExportType === 0) {
      if (startDate && endDate) {
        onDismiss(selectedExportType, startDate, endDate)
      }
    } else {
      onDismiss(selectedExportType, new Date(), new Date())
    }
  }

  const showExportTypePane = () => {
    if (selectedExportType === 0) {
      return (
        <IonItem>
          <IonGrid>
            <IonRow>
              <IonCol>
                <div>Zeitspanne auswählen</div>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol>

                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => {
                    setDateRange(update);
                  }}
                  // isClearable={true}
                  customInput={<DateInputComponent/>}
                  dateFormat="dd.MMM yyyy"
                  portalId="root-portal"
                />
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonItem>
      )
    }
    return (
      <></>
    )
  }

  const DateInputComponent = forwardRef<HTMLIonInputElement, {}>(function CustomInput(p, ref) {
    return (
      <IonInput style={{"--padding-start": "16px"}}
                {...p}
                label={"Zeitraum"}
                placeholder="Zeitraum wählen"
                fill="outline"
                labelPlacement={"floating"}
                ref={ref}
      >
      </IonInput>
    );
  });

  return (
    <IonContent className="ion-padding" color="eeglight">
      <IonGrid>
        <IonRow>
          <IonCol size="auto">
            <IonItem lines="none">
              <IonLabel>Download Daten für <strong>{tenant}</strong></IonLabel>
            </IonItem>
          </IonCol>
        </IonRow>
        <IonRow>
          <IonCol size="auto">
            <ToggleButtonComponent
              buttons={[{label: 'Energiedaten', icon: people}, {label: 'Stammdaten', icon: eegBusiness}]}
              onChange={setSelectedExportType}
              value={selectedExportType}
              changeable={true}
            />
          </IonCol>
        </IonRow>
      </IonGrid>
      {showExportTypePane()}
      <IonButton expand="block" onClick={() => onOk()}>Export</IonButton>
    </IonContent>
  )
}

export default DatepickerPopover;