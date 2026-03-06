import React, {FC, KeyboardEvent, useEffect, useRef, useState} from "react";
import {InputChangeEventDetail, IonInput} from "@ionic/react";
import {Control, Controller, FieldError, FieldValues, Path, UseFormClearErrors} from "react-hook-form";
import {IonInputCustomEvent} from "@ionic/core/dist/types/components";
import {InputInputEventDetail} from "@ionic/core/dist/types/components/input/input-interface";

import "./form-element.css";

function noop() {
}

type NumberInputFormProps<T extends FieldValues> = {
  control: Control<T>,
  clear?: UseFormClearErrors<any>
  name: Path<T>,
  label: string,
  placeholder?: string,
  rules?: object,
  error?: FieldError,
}

interface NumberInput {
  initialValue: number | undefined
  label: string
  name: string
  onChange: (...event: any[]) => void
  decimalScale: number
  placeholder?: string
  onKeyDown?: (e: KeyboardEvent<HTMLIonInputElement>) => void
  onKeyUp?: (e: KeyboardEvent<HTMLIonInputElement>) => void
  maxlength?: number
  maxValue?: number
  helperText?: string
}

const NumberInput: FC<NumberInput> = ({
                                        initialValue,
                                        label,
                                        name,
                                        onChange,
                                        placeholder,
                                        maxValue,
                                        decimalScale,
                                        onKeyDown = noop,
                                        onKeyUp = noop,
                                        helperText,
                                      }) => {

  const [value, setValue] = useState<string>("");
  const [cursor, setCursor] = useState<number | null>(null);
  const inputRef = useRef<HTMLIonInputElement>()


  useEffect(() => {
    setValue(initialValue ? formatValue(initialValue.toString()) : "")
  }, [initialValue]);

  // useEffect(() => {
  //   const input = inputRef.current;
  //   if (input) input.getInputElement().then(e => e.setSelectionRange(cursor, cursor))
  // }, [inputRef, cursor]);


  const format = (value: string): number => value === '' ? 0 : parseFloat(value.replace(",", "."))

  const formatValue = (value: string): string => {
    let numValue: number
    try {
      numValue = parseFloat(value)
    } catch (e) {
      numValue = 0
    }
    return numValue === 0 ? '' : value.replace(".", ",")
  }

  // const isNumeric = (value: any): boolean => !new RegExp(/[^\d,]/g).test(value.trim())
  const isNumeric = (value: any): boolean => new RegExp(/^[-]{0,1}\d*,{0,1}\d{0,2}$/).test(value.trim())

  const allowNegative = false
  const prefix = ''
  const fixedDecimalScale = false
  const decimalSeparator = ','

  const _onKeyDown = (e: KeyboardEvent<HTMLIonInputElement>) => {
    const el = e.target as HTMLInputElement;
    const {key} = e;
    const {selectionStart, selectionEnd, value = ''} = el;

    let expectedCaretPosition: number | null = null;

    //Handle backspace and delete against non numerical/decimal characters or arrow keys
    if (key === 'ArrowLeft' || key === 'Backspace') {
      expectedCaretPosition = Math.max((selectionStart as number) - 1, 0);
    } else if (key === 'ArrowRight') {
      expectedCaretPosition = Math.min((selectionStart as number) + 1, value.length);
    } else if (key === 'Delete') {
      expectedCaretPosition = selectionStart;
    }

    setCursor(expectedCaretPosition)
  };

  const _onKeyUp = (e: KeyboardEvent<HTMLIonInputElement>) => {
    const el = e.target as HTMLInputElement;
    const {selectionStart, selectionEnd, value = ''} = el;

    // if multiple characters are selected and user hits backspace, no need to handle anything manually
    if (selectionStart !== selectionEnd) {
      onKeyUp(e);
      return;
    }

    let currentSelection = cursor
    if (!currentSelection) currentSelection = selectionStart
    el.setSelectionRange(currentSelection, currentSelection)
  }

  const onChangeValue = (e: IonInputCustomEvent<InputChangeEventDetail>) => {
    if (e.target.value) {
      onChange(format(e.target.value.toString()))
    }
  }

  const splitDecimal = (numStr: string, allowNegative: boolean = true) => {
    const hasNegation = numStr[0] === '-';
    const addNegation = hasNegation && allowNegative;
    numStr = numStr.replace('-', '');

    const parts = numStr.split('.');
    const beforeDecimal = parts[0];
    const afterDecimal = parts[1] || '';

    return {
      beforeDecimal,
      afterDecimal,
      hasNegation,
      addNegation,
    };
  }

  const handleValueChange = (values: IonInputCustomEvent<InputInputEventDetail>) => {
    if (values.detail.value || values.detail.value === '') {
      const target = values.detail.value.toString()
      if (!target || target.length === 0 || isNumeric(target)) {
        setValue(target || "");
        // values.detail.value = formatValue(target)
        // values.target.getInputElement().then(e => {
        inputRef.current?.getInputElement().then(e => {
          let currentSelection = cursor
          currentSelection = Math.min((e.selectionStart as number), target.length);
          values.detail.value = formatValue(target)
          // setCursor(currentSelection)
          e.setSelectionRange(currentSelection, currentSelection)
        })

        // onChange(format(target))
      } else {

        // values.target.getInputElement().then(e => {
        //   e.setSelectionRange(e.selectionStart, e.selectionStart)
        //   e.value = value
        // })

        if (inputRef.current) {
          // inputRef.current.value = value
          inputRef.current.getInputElement().then(e => {
            const caretPos = Math.max((e.selectionStart as number) - 1, 0);
            inputRef.current!.value = value
            e.setSelectionRange(caretPos, caretPos)
          })
        }
      }
    }
  };

  return (
    <IonInput style={{"--padding-start": "16px"}}
              label={label}
              placeholder={placeholder}
              fill="outline"
              labelPlacement={"floating"}
              value={value}
              name={name}
              ref={(e) => {
                if (e) inputRef.current = e
              }}
      // ref={inputRef}
              onIonChange={onChangeValue}
              onIonInput={(e) => handleValueChange(e as IonInputCustomEvent<HTMLInputElement>)}
              helperText={helperText}
      // onKeyDown={_onKeyDown}
      // onKeyUp={_onKeyUp}
    >
    </IonInput>
  )
}

const NumberInputForm = <T extends FieldValues>(props: NumberInputFormProps<T>) => {
  const {control, name, label, placeholder, rules, error} = props
  return (
    <div className={"form-element"}>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({field, fieldState, formState}) => {
          const {onChange, value, name, ref} = field;
          return (
            <NumberInput onChange={onChange} name={name} label={label} placeholder={placeholder} initialValue={value || undefined}
                         decimalScale={2} helperText={fieldState.error?.message}/>)
        }}
      />
      {error && <div className={"error-line"}>{error.message}</div>}
    </div>
  )
}

export default NumberInputForm