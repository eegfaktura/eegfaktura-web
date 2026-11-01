import React, {FC, useEffect, useRef, useState} from "react";
import DatePicker from "react-datepicker";

import "./DatePickerCore.element.scss"
import {DATE_PICKER_EXAMPLE, DATE_PICKER_PROPS, isSameDay} from "../../../util/DateFormat.util";
import DateTextInput from "../../form/DateTextInput.component";

interface DatePickerCoreProps {
  initialValue: Date | null
  onChange: (name: string, value: any) => void
  name: string,
  label: string,
  placeholder?: string,
  rules?: object,
  disabled?: boolean,

}

const DatePickerCoreElement: FC<DatePickerCoreProps> = ({name, initialValue, onChange, label, placeholder}) => {

  const [currentDate, setCurrentDate] = useState<Date>(initialValue ? new Date(initialValue) : new Date())

  // the last date handed to onChange; initialValue does not tell: callers hold it in a ref, without a new render
  const saved = useRef(initialValue)

  useEffect(() => {
    setCurrentDate(initialValue ? new Date(initialValue) : new Date())
    saved.current = initialValue
  }, [initialValue]);

  // Saved once on leaving: on closing the calendar, or on leaving the field when it is already closed. Reaching the
  // field with Tab opens and closes the calendar, so this also runs without an edit.
  const onUpdate = () => {
      if (isSameDay(currentDate, saved.current)) return
      saved.current = currentDate
      setCurrentDate(currentDate)
      onChange(name, currentDate)
  }

  return (
    <div className="form-element">
      <DatePicker
        // selectsRange={false}
        selected={currentDate}
        name={name}
        onChange={(update) => {
          update && setCurrentDate(update)
        }}
        customInput={<DateTextInput label={label}/>}
        placeholderText={placeholder + " " + DATE_PICKER_EXAMPLE}
        onCalendarClose={onUpdate}
        onBlur={onUpdate}
        {...DATE_PICKER_PROPS}
        portalId="root-portal"
      />
      {/*{error && <div className={"error-line"}>{error.message}</div>}*/}
    </div>
  )
}
export default DatePickerCoreElement;