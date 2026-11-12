import {Control, FieldError} from "react-hook-form";
import InputForm, {PartialChangeFunction} from "./InputForm.component";
import {useMaskito} from "@maskito/react";
import React from "react";

interface PhoneInputFormProps<T extends object> {
  name:string
  control: Control<T, any>
  error?: FieldError
  onChangePartial?: PartialChangeFunction
  readonly?: boolean,
}

export function PhoneInputForm<T extends object>(props : PhoneInputFormProps<T>) {
// export function PhoneInputForm<T extends object>(props : PhoneInputFormProps<T>) {
  const phoneMask = useMaskito({
    options: {
      // mask: /^\d{0,4}\s{0,1}\d*$/,
      mask: /\+?[0-9]{0,2}([0-9]|\/|\(|\)|\-|\s)*/,
    },
  });

  return (
    <InputForm label="Telefon"
               rules={{required: "Telefonnummer ist erforderlich", minLength: {value: 4, message: "Telefonnummer ist ungültig"}}}
               type="text"
               mask={phoneMask}
               {...props}
    />)
}