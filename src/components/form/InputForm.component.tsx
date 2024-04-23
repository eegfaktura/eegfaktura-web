import React, {ClipboardEvent} from "react";
import {InputChangeEventDetail, IonInput} from "@ionic/react";
import {Control, Controller, ControllerRenderProps, FieldError, RefCallBack} from "react-hook-form";
import {TextFieldTypes} from "@ionic/core";

import "./form-element.css";
import {IonInputCustomEvent} from "@ionic/core/dist/types/components";
import {InputInputEventDetail} from "@ionic/core/dist/types/components/input/input-interface";
import {ControllerFieldState} from "react-hook-form/dist/types/controller";
import Input from "./Input.component";

export type PartialChangeFunction = (name: string, value: any, event?: any) => void

interface InputFormProps {
  control: Control<any, any>,
  name: string,
  label: string,
  placeholder?: string,
  rules?: object,
  error?:  FieldError,
  type?: TextFieldTypes,
  disabled?: boolean,
  readonly?: boolean,
  inputmode?: "text" | "search" | "numeric" | "none" | "tel" | "url" | "email" | "decimal" | undefined,
  counter?: boolean,
  maxlength?: number,
  pattern?: string,
  onPaste?: (e: ClipboardEvent<HTMLIonInputElement>) => void,
  onTransform?: (e: IonInputCustomEvent<InputInputEventDetail>) => string | number,
  onChangePartial?: PartialChangeFunction
  protectedControl?: boolean
  mask?: React.RefCallback<HTMLElement>
  isNumber?: boolean
  isEmail?: boolean
  multiple?:boolean
}

const InputForm: (React.FC<InputFormProps>) =
  ({ control, name,rules, error, placeholder, onTransform, onChangePartial, type, protectedControl,...rest}) => {

  const handleOnChange = (onChange: PartialChangeFunction | undefined, fieldState: ControllerFieldState) => (e:IonInputCustomEvent<InputChangeEventDetail>) => {
    if (onChange === undefined) return undefined
    if (!fieldState.invalid && fieldState.isDirty) onChange(name, e.target.value, e)
  }

  const handleOnChange1 = <TValue extends string|number>(onChange: PartialChangeFunction | undefined, fieldState: ControllerFieldState) => (value: TValue, e:IonInputCustomEvent<InputChangeEventDetail>) => {
    if (onChange === undefined) return undefined
    if (!fieldState.invalid && fieldState.isDirty) onChange(name, value, e)
  }

  const renderControl = (field: ControllerRenderProps<any, string>, fieldState: ControllerFieldState) => {
    const { onChange, value, name, ref,onBlur } = field;

    if (protectedControl) {
      return (
        <div style={{display:"flex", flexFlow:"column", border: "1px solid var(--ion-color-light)", padding: "5px", background: "var(--ion-color-light)", borderRadius: "4px"}}>
          <div style={{fontSize:"0.8em", color: "black", fontFamily:'Roboto, "Helvetica Neue", "sans-serif"'}}>{rest.label}:</div>
          <div style={{fontSize:"1.0em", margin: "6px", color: "var(--ion-color-primary-shade)", fontFamily:'Roboto'}}>{value}</div>
        </div>
      )
    }

    // const inputRef = (controlRef: RefCallBack) => async (input: any) => {
    //   if (input) {
    //     if (rest.mask) {
    //       const m = await input.getInputElement();
    //       rest.mask(m);
    //     }
    //     controlRef(input)
    //   }
    // }

    // return (<IonInput
    //   onIonChange={handleOnChange(onChangePartial, fieldState)}
    //   onIonInput={(e) => {
    //     let value: string | number = e.detail.value || ""
    //     if (onTransform) {
    //       value = onTransform(e)
    //     }
    //     onChange((type === 'number' ? Number(value) : value))
    //   }}
    //   placeholder={placeholder ? placeholder : "Enter Text"}
    //   fill="outline"
    //   labelPlacement={"floating"}
    //   value={value}
    //   name={name}
    //   ref={inputRef(ref)}
    //   {...rest}></IonInput>)

    return (<Input
      onChange={onChange}
      onValueChanged={handleOnChange1(onChangePartial, fieldState)}
      placeholder={placeholder ? placeholder : "Enter Text"}
      defaultValue={value}
      value={value}
      name={name}
      // ref={inputRef(ref)}
      controlRef={ref}
      {...rest}></Input>)

  }

  return (
    <div className={"form-element"}>
        <Controller
          name={name}
          control={control}
          rules={rules}
          render={({field, fieldState, formState}) => {
            return (
              renderControl(field, fieldState)
            )
          }}
        />
      {!protectedControl && error && <div className={"error-line"}>{error.message}</div>}
    </div>
  );
};
export default InputForm;
