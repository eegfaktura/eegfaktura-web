import React, {FC} from "react";
import DatePicker from "react-datepicker";
import {Control, FieldError, useController, UseFormClearErrors} from "react-hook-form";

import "./DatePickerForm.element.scss"
import {DATE_PICKER_EXAMPLE, DATE_PICKER_PROPS} from "../../util/DateFormat.util";
import DateTextInput from "./DateTextInput.component";
import {useDateOnLeave} from "./useDateOnLeave.hook";

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

  const {field} = useController({name, control, rules})
  const stored = typeof field.value === 'string' ? new Date(field.value) : field.value instanceof Date ? field.value : undefined

  const {picker, onTyping, pickerProps} = useDateOnLeave(stored, (date) => {
    field.onChange(date)
    onChangeDate && onChangeDate(name, date)
  })

  return (
    <div className="form-element">
      <DatePicker
        // selectsRange={false}
        name={name}
        customInput={<DateTextInput label={label} onTyping={onTyping}/>}
        placeholderText={placeholder + " " + DATE_PICKER_EXAMPLE}
        disabled={disabled}
        {...pickerProps}
        {...DATE_PICKER_PROPS}
        ref={(instance) => {
          (picker as React.MutableRefObject<DatePicker | null>).current = instance
          field.ref(instance)
        }}
        portalId="root-portal"
      />
      {error && <div className={"error-line"}>{error.message}</div>}
    </div>
  )
}
export default DatePickerFormElement;