import React, {FC} from "react";
import {useMaskito} from "@maskito/react";
import InputForm, {PartialChangeFunction} from "./InputForm.component";
import {Control, FieldError} from "react-hook-form";
import {MaskitoOptions} from "@maskito/core";
import {isValidIban} from "../../util/Iban.util";

interface IbanInputFormProps<T extends object> {
  name: string
  control: Control<T, any>
  error?: FieldError
  onChangePartial?: PartialChangeFunction
  readonly?: boolean,
  // false: an empty IBAN is allowed (member pays without SEPA, platform#143); a value is still checked
  required?: boolean,
}

export function IbanInputForm<T extends object>({required = true, ...props} : IbanInputFormProps<T>) {
  const digitsOnlyMask: MaskitoOptions = {
    mask:  [
      ...Array(2).fill(/[A-Z]/),
      ...Array(2).fill(/\d/),
      ' ',
      ...Array(4).fill(/[A-Z0-9]/),
      ' ',
      ...Array(4).fill(/\d/),
      ' ',
      ...Array(4).fill(/\d/),
      ' ',
      ...Array(4).fill(/\d/),
      ' ',
      ...Array(4).fill(/\d/),
      ' ',
      ...Array(4).fill(/\d/),
    // ],
    // preprocessors: [
    //   ({elementState, data}, actionType) => {
    //     const {value, selection} = elementState;
    //
    //     return {
    //       elementState: {
    //         selection,
    //         value,
    //       },
    //       data
    //     };
    //   },
    ]
  }

  const ibanMask = useMaskito({
    options: digitsOnlyMask,
  });

  return (
    <InputForm label="IBAN"
               rules={{
                 required: required ? "IBAN fehlt" : false,
                 minLength: {value: 16, message: "IBAN ist ungültig"},
                 // an empty field is left to `required`; a value must have valid check digits
                 validate: (v: string | undefined) => !v?.trim() || isValidIban(v) || "IBAN ist ungültig (Prüfziffer stimmt nicht)",
               }}
               type="text"
               mask={ibanMask}
               {...props}
    />)
}