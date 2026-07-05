import React, {FC} from "react";
import {Control, FieldErrors} from "react-hook-form";
import {Eeg, EegRegister} from "../../models/eeg.model";
import InputForm from "../form/InputForm.component";
import SelectForm from "../form/SelectForm.component";

interface AddressEegPropertiesComponentProps {
  control: Control<EegRegister, any>
  errors?: FieldErrors<EegRegister>
}

const AddressEegPropertiesComponent: FC<AddressEegPropertiesComponentProps> = ({control, errors}) => {
  return (
    <div style={{padding: "16px"}}>
      {/*<CorePageTemplate>*/}
      <h2>Kontakt Einstellungen Erneuerbarer Energie Gemeinschaften</h2>
      <InputForm name={"address.street"} label="Straße" control={control} rules={{required: "Straße fehlt"}} type="text" error={errors?.address?.street}/>
      <InputForm name={"address.streetNumber"} label="Hausnummer" control={control} rules={{required: "Hausnummer fehlt"}} type="text" error={errors?.address?.streetNumber}/>
      <InputForm name={"address.city"} label="Ort" control={control} rules={{required: "Ort fehlt"}} type="text" error={errors?.address?.city}/>
      <InputForm name={"address.zip"} label="Postleitzahl" control={control} rules={{required: "Postleitzahl fehlt"}} type="text" error={errors?.address?.zip}/>
      <InputForm name={"contact.phone"} label="Telefonnummer" control={control} type="text"/>
      <InputForm name={"contact.email"} label="E-Mail" control={control} type="text"/>
      <InputForm name={"optionals.website"} label="Webseite" control={control} type="text"/>
    </div>
  )
}

export default AddressEegPropertiesComponent