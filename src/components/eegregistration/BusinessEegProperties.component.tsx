import React, {FC} from "react";
import {Eeg, EegRegister} from "../../models/eeg.model";
import {Control, Controller, FieldErrors} from "react-hook-form";
import InputForm from "../form/InputForm.component";
import {Metering} from "../../models/meteringpoint.model";
import SelectForm from "../form/SelectForm.component";
import CorePageTemplate from "../core/CorePage.template";
import {IonItem, IonToggle} from "@ionic/react";
import {IbanInputForm} from "../form/IbanInputForm";


interface BusinessEegPropertiesComponentProps {
  control: Control<EegRegister, any>
  errors?: FieldErrors<EegRegister>
}

const BusinessEegPropertiesComponent: FC<BusinessEegPropertiesComponentProps> = ({control, errors}) => {

  return (
    <div style={{padding: "16px"}}>
    {/*<CorePageTemplate>*/}
      <h2>Geschäftliches</h2>
      <InputForm name={"businessNr"} label="Geschäftsnummer" control={control} type="text" placeholder="Geschäftsnummer deiner EEG"/>
      <InputForm name={"taxNumber"} label="Steuernummer" control={control} type="text"/>
      <InputForm name={"vatNumber"} label="Mehrwertsteuer-ID" control={control} type="text"/>

      <h6>Verrechnung</h6>
      <SelectForm label={"Abrechnungszeitraum"} placeholder={"Abrechnungszeitraum"} control={control}
                  name={"settlementInterval"} options={[
        {key: "MONTHLY", value: "Monatlich"},
        {key: "QUARTER", value: "Vierteljährlich"},
        {key: "BIANNUAL", value: "Halbjährlich"},
        {key: "ANNUAL", value: "Jährlich"},
      ]}></SelectForm>
      <IbanInputForm name={"accountInfo.iban"} control={control} />
      <InputForm name={"accountInfo.owner"} label="Kontoinhaber" control={control} type="text"/>
      <IonItem lines="none">
        <Controller
          name={"accountInfo.sepa"}
          control={control}
          render={({field}) => {
            const {onChange, value} = field;
            return (<IonToggle
              style={{width: "100%"}}
              slot="start"
              labelPlacement="start"
              checked={value}
              onIonChange={(e) => {
                onChange(e.detail.checked);
              }}>SEPA aktiv</IonToggle>)
          }
          }
        />
      </IonItem>
    {/*</CorePageTemplate>*/}
    </div>
  )
}

export default BusinessEegPropertiesComponent