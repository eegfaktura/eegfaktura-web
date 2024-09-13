import React, {FormEvent, useRef, useState} from "react";
import {IonInput} from "@ionic/react";
import {Control, FieldValues, Path, UseFormClearErrors} from "react-hook-form";
import {IonInputCustomEvent} from "@ionic/core/dist/types/components";
import {InputInputEventDetail} from "@ionic/core/dist/types/components/input/input-interface";


type NumberInputFormProps<T extends FieldValues> = {
  control: Control<T>,
  clear?: UseFormClearErrors<any>
  name: Path<T>,
  label: string,
  placeholder?: string,
  onTransform?: (e: IonInputCustomEvent<InputInputEventDetail>) => string | number,
}
const NumberInput1 = <T extends FieldValues>(props: NumberInputFormProps<T>) => {
  const {control, name, label, placeholder} = props

  const [inputValue, setInputValue] = useState("1");
  const inputRef = useRef<HTMLIonInputElement>()
  // const {
  //   field: { onChange, value, ref, ...field },
  // } = useController({ control, name });


  // useEffect(() => {
  //   console.log("VALUES: ", value)
  // }, [value]);

  // const InputComponent = (props: InputAttributes) => {
  //   console.log("INPUT PROPS: ", props)
  //
  //   const {step, hidden, type,onChange, onBlur,
  //     onSubmit, onCopy, onCopyCapture,
  //     onCut, onCutCapture,onPaste, onPasteCapture, onPause,  ...rest} = props
  //   return (
  //     <IonInput style={{"--padding-start": "16px"}}
  //               label={label}
  //               placeholder={placeholder}
  //               fill="outline"
  //               labelPlacement={"floating"}
  //               ref={ref}
  //               value={value}
  //               // type={"number"}
  //     >
  //     </IonInput>
  //   );
  // };

  // const handleValueChange = (values: NumberFormatValues) => {
  //   console.log(values)
  //   onChange(values.floatValue);
  // };

  const isNumeric = (value: any): boolean => !new RegExp(/[^\d,]/g).test(value.trim())
  const handleValueChange = (onChange: (...event: any[]) => void) => (values: IonInputCustomEvent<InputInputEventDetail>) => {

    if (isNumeric(values.detail.value)) {
      if(values.detail.value) {
        setInputValue(values.detail.value.toString());
      }
    }
  };

  const handleValueChange1 = (values: IonInputCustomEvent<InputInputEventDetail>) => {
    if(values.detail.value) {
      if (isNumeric(values.detail.value.toString())) {
        setInputValue(values.detail.value.toString());
      } else {
        if (inputRef.current) {
          inputRef.current.value = inputValue
        }
      }
    }
  };

  const handleFormat = (event: FormEvent<HTMLIonInputElement>) => {
    // console.log(event)
    // if (isNumeric(values.detail.value)) {
    //
    // }
  };

  return (
    // <NumericFormat prefix={'$'}
    //                // customInput={InputComponent}
    //   customInput={IonInput}
    //                value={value}
    //                onValueChange={handleValueChange}
    //                getInputRef={ref}
    //                displayType={"input"}
    //                {...field}
    // />

    <IonInput style={{"--padding-start": "16px"}}
              label={label}
              placeholder={placeholder}
              fill="outline"
              labelPlacement={"floating"}
              value={inputValue}
              name={name}
              ref={(e) => {
                if (e) inputRef.current = e
              }}
              onIonInput={handleValueChange1}
              onChange={handleFormat}
    >
    </IonInput>
  )


  // return (
  //   <div className={"form-element"}>
  //     {/*<IonItem disabled={disabled} style={{"--min-height": "12px"}}>*/}
  //     {/*{label && (*/}
  //     {/*  <IonLabel position="floating">{label}</IonLabel>*/}
  //     {/*)}*/}
  //     <Controller
  //       name={name}
  //       control={control}
  //       render={({field, fieldState, formState}) => {
  //         const { onChange, value, name, ref } = field;
  //         return (<IonInput
  //           // onIonChange={(e) => {
  //           //   if (fieldState.invalid) {
  //           //     if (clear) clear(name)
  //           //   }
  //           //   console.log("onIonChange: ", e)
  //           //   onChange((rest.type === 'number' ? Number(e.detail.value!) : e.detail.value!))
  //           // }}
  //           // onIonBlur={(e) => {
  //           //   console.log("Input OnBlure");
  //           //   onChange((rest.type === 'number' ? Number(e.target.value) : e.target.value!))
  //           // }}
  //           // onChange={onChange}
  //           // onIonBlur={(e) => console.log("onIonBlur: ", e)}
  //           onIonInput={handleValueChange1}
  //           onChange={handleFormat}
  //           placeholder={placeholder ? placeholder : "Enter Text1"}
  //           fill="outline"
  //           labelPlacement={"floating"}
  //           value={inputValue}
  //           // onBeforeInput={handleFormat}
  //           // name={name}
  //           // onChange={onChange}
  //           // ref={ref}
  //           // errorText={rest.error?.message}
  //           ></IonInput>)
  //       }}
  //     />
  //   </div>
  // );
}

//export default NumberInput


