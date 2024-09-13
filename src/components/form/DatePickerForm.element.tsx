import React, {FC, FormEvent, forwardRef, HTMLProps, useEffect, useState} from "react";
import DatePicker from "react-datepicker";
import {Control, Controller, FieldError, UseFormClearErrors, useWatch} from "react-hook-form";
import {InputChangeEventDetail, IonInput} from "@ionic/react";

import "./DatePickerForm.element.scss"
import {IonInputCustomEvent} from "@ionic/core/dist/types/components";
import {InputInputEventDetail} from "@ionic/core/dist/types/components/input/input-interface";
import moment from "moment";

interface DatePickerFormProps {
  control: Control<any, any>,
  clear?: UseFormClearErrors<any>
  name: string,
  label: string,
  placeholder?: string,
  rules?: object,
  error?: FieldError,
  disabled?: boolean,
  onChangeDate?: (name: string, value: any, event?: any) => void
}

const DatePickerFormElement: FC<DatePickerFormProps> = ({name, control, rules, label, placeholder, error, disabled, onChangeDate}) => {

  const value = useWatch({control, name: name, defaultValue: undefined})
  const [showDate, setShowDate] = useState<Date>()

  useEffect(() => {
    const dateValue = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : new Date(Date.now())
    setShowDate(dateValue)
  }, [value]);

  const handleUpdate = (onChange: (...event: any[]) => void) => () => {
    onChange(showDate)
    onChangeDate && onChangeDate(name, showDate)
  }

  // const Component = forwardRef<HTMLIonInputElement, { /*onIonChange: (event: IonInputCustomEvent<InputChangeEventDetail>) => void, onIonInput: (event: IonInputCustomEvent<InputInputEventDetail>) => void*/}>(function CustomInput(p, ref) {
  const Component = forwardRef<HTMLIonInputElement, HTMLProps<HTMLIonInputElement>>(function CustomInput(p, ref) {
    const handleInput1 = (event: IonInputCustomEvent<InputInputEventDetail>) => {
      const date = event.detail.value
      const valid = !!date && date.match(/^\w*\s\d{1,2},\s\d{4}$/)
      if (valid && valid.length > 0) {
        const dateObj = moment(date, "MMMM D, YYYY")
        setShowDate(dateObj.toDate())
      }
    }

    return (
        <IonInput
          value={p.value ? p.value.toString() : undefined}
          onClick={p.onClick}
          onIonChange={(e) => {
            p.onChange && p.onChange(e as unknown as FormEvent<HTMLIonInputElement>)
          }}
          style={{flexDirection: "row-reverse"}}
          label={label}
          placeholder={placeholder + " z.B. April 2, 2024"}
          fill="outline"
          labelPlacement={"floating"}
          ref={ref}
          disabled={disabled}
        />
    );
  });

  return (
    <div className="form-element">
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({field, fieldState, formState}) => {
          const {onChange, onBlur, value, name, ref} = field;
          const dateValue = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : new Date(Date.now())
          return (
            <DatePicker
              // selectsRange={false}
              selected={showDate}
              adjustDateOnChange={true}
              name={name}
              onChange={(update) => {
                update && setShowDate(update)
              }}
              customInput={<Component />}
              onCalendarClose={handleUpdate(onChange)}
              dateFormat="MMMM d, yyyy"
              ref={ref}
              portalId="root-portal"
            />
          )
        }}/>
      {error && <div className={"error-line"}>{error.message}</div>}
    </div>
  )
}
export default DatePickerFormElement;