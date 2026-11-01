import React, {FC, useEffect, useState} from "react";
import DatePicker from "react-datepicker";
import {Control, Controller, FieldError, UseFormClearErrors, useWatch} from "react-hook-form";

import "./DatePickerForm.element.scss"
import {DATE_PICKER_EXAMPLE, DATE_PICKER_PROPS} from "../../util/DateFormat.util";
import DateTextInput from "./DateTextInput.component";

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
  const [showDate, setShowDate] = useState<Date | undefined>()

  useEffect(() => {
    // const dateValue = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : new Date(Date.now())
    const dateValue = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : undefined
    setShowDate(dateValue)
  }, [value]);

  const handleUpdate = (onChange: (...event: any[]) => void) => () => {
    onChange(showDate)
    onChangeDate && onChangeDate(name, showDate)
  }

  return (
    <div className="form-element">
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({field, fieldState, formState}) => {
          const {onChange, onBlur, value, name, ref} = field;
          // const dateValue = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : new Date(Date.now())
          return (
            <DatePicker
              // selectsRange={false}
              selected={showDate}
              adjustDateOnChange={true}
              name={name}
              onChange={(update) => {
                update && setShowDate(update)
              }}
              customInput={<DateTextInput label={label}/>}
              placeholderText={placeholder + " " + DATE_PICKER_EXAMPLE}
              disabled={disabled}
              onCalendarClose={handleUpdate(onChange)}
              {...DATE_PICKER_PROPS}
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