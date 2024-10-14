import {Control, FieldError, FieldValues, set, UseFormSetValue} from "react-hook-form";
import InputForm, {PartialChangeFunction} from "./InputForm.component";
import {useMaskito} from "@maskito/react";
import React, {ClipboardEvent} from "react";
import { test } from "vitest";


interface PhoneInputFormProps<T extends object> {
  name:string
  control: Control<T, any>
  setValue: UseFormSetValue<any>,
  error?: FieldError
  onChangePartial?: PartialChangeFunction
  readonly?: boolean,
}

export function PhoneInputForm<T extends object>({setValue, ...props} : PhoneInputFormProps<T>) {
// export function PhoneInputForm<T extends object>(props : PhoneInputFormProps<T>) {
  const phoneMask = useMaskito({
    options: {
      // mask: /^\d{0,4}\s{0,1}\d*$/,
      mask: /\+?[0-9]{0,2}([0-9]|\/|\(|\)|\-|\s)*/,
    },
  });

  const handlePhonePaste = (e: ClipboardEvent<HTMLIonInputElement>) => {
    e.persist()
    e.clipboardData.items[0].getAsString(text=>{
      setValue(props.name, test)
      // setValue(props.name, text.replace(/\+/gi, "00").replace(/\s/gi,""))
      console.log("Clipboard-Text: ", text, text.replace(/\+/gi, "00").replace(/\s/gi,""))
    })
    e.stopPropagation()
  }

  return (
    <InputForm label="Telefon"
               rules={{required: "Telefonnummer ist erforderlich", minLength: {value: 4, message: "Telefonnummer ist ungültig"}}}
               type="text"
               mask={phoneMask}
               onPaste={handlePhonePaste}
               {...props}
    />)
}