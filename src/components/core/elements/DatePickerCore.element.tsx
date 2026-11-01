import React, {FC, useEffect, useState} from "react";
import DatePicker from "react-datepicker";

import "./DatePickerCore.element.scss"
import {DATE_PICKER_EXAMPLE, DATE_PICKER_PROPS} from "../../../util/DateFormat.util";
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

  useEffect(() => {
    setCurrentDate(initialValue ? new Date(initialValue) : new Date())
  }, [initialValue]);

  const onUpdate = () => {
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
        {...DATE_PICKER_PROPS}
        portalId="root-portal"
      />
      {/*{error && <div className={"error-line"}>{error.message}</div>}*/}
    </div>
  )
}
export default DatePickerCoreElement;