import React, {useCallback, useEffect} from "react";
import {InputChangeEventDetail, IonInput} from "@ionic/react";
import {TextFieldTypes} from "@ionic/core";
import {ChangeHandler} from "react-hook-form/dist/types/form";
import {ControllerRenderProps} from "react-hook-form/dist/types/controller";
import {IonInputCustomEvent} from "@ionic/core/dist/types/components";
import {ReducerType} from "@reduxjs/toolkit";
import {RefCallBack} from "react-hook-form";

// export interface InputProps {
//   name: string;
//   control?: Control;
//   label?: string;
//   component?: JSX.Element;
// }
//
// const Input: FC<InputProps> = ({
//   name,
//   control,
//   component,
//   label}) => {
//   return (
//     <>
//       <IonItem class="ion-padding">
//         {label && (
//           <IonLabel position="floating">{label}</IonLabel>
//         )}
//         <Controller
//           name={name}
//           control={control}
//           render={({field}) => (<IonInput {...field}/>)}
//         />
//       </IonItem>
//     </>
//   );
// };

// type IsNumber<TNumber = boolean> = TNumber extends true ? true : false
type TValueType<IsNumber> = IsNumber extends false ? string : number;

interface InputProps<TValue, IsNumber extends boolean> {
  defaultValue: TValue | undefined
  onValueChanged?: (value: TValue, ev: IonInputCustomEvent<InputChangeEventDetail>) => void
  label?: string,
  placeholder?: string,
  disabled?: boolean,
  readonly?: boolean,
  inputMode?: "text" | "search" | "numeric" | "none" | "tel" | "url" | "email" | "decimal" | undefined,
  counter?: boolean,
  maxlength?: number,
  pattern?: string,
  isNumber?: IsNumber
  multiple?:boolean
  isEmail?:boolean
  mask?: React.RefCallback<HTMLElement>
  controlRef: RefCallBack
  // onChange: (...event: any[]) => void
}

function Input<TValue, IsNumber extends boolean = false>(props: Omit<ControllerRenderProps, "onBlur" | "ref"> & InputProps<TValue, IsNumber>) {

  const {value, controlRef, onChange, onValueChanged, defaultValue, isNumber, mask, isEmail, ...rest} = props;
  const inputRef = (controlRef: RefCallBack) => async (input: any) => {
    if (input) {
      if (mask) {
        const m = await input.getInputElement();
        mask(m);
      }
      controlRef(input)
    }
  }

  const evaluate = (value: string | number | null | undefined) => {
    if (isNumber) {
      return !value || isNaN(parseInt(value as string, 10)) ? "" : parseInt(value as string, 10)
    }
    return value ? value.toString() : ""
  }

  const handleChange = async (e: IonInputCustomEvent<InputChangeEventDetail>) => {
    const value = evaluate(e.target.value) // as TValue
    console.log("Handle Change TypeOf Value", typeof e.target.value, props.name, "ValueType", typeof value, typeof defaultValue)
    const changeFunc = async (value: TValue) => {
      onValueChanged && onValueChanged(value, e)
    }
    await changeFunc(value as TValue)
  }

  const handleInput = async (e: IonInputCustomEvent<InputChangeEventDetail>) => {
    onChange && onChange(evaluate(e.target.value))
  }

  const parseValue = (value: TValue | undefined) => {
    if (typeof value === "number") {
      return isNaN(value) || value === 0 ? "" : value.toString()
    }
    return value ? value as string : ""
  }

  return (
    <IonInput fill="outline" labelPlacement="floating"
              type={isEmail ? "email" : "text"}
              value={parseValue(defaultValue)}
              onIonInput={handleInput}
              onIonChange={handleChange}
              ref={inputRef(controlRef)}
              {...rest}/>
  )
}


export default Input;