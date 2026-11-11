import React, {FC} from "react";
import DatePicker from "react-datepicker";

import "./DatePickerCore.element.scss"
import {DATE_PICKER_EXAMPLE, DATE_PICKER_PROPS} from "../../../util/DateFormat.util";
import DateTextInput from "../../form/DateTextInput.component";
import {useDateOnLeave} from "../../form/useDateOnLeave.hook";

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

  const {picker, onTyping, pickerProps} = useDateOnLeave(initialValue ? new Date(initialValue) : null, (date) => onChange(name, date))

  return (
    <div className="form-element">
      <DatePicker
        // selectsRange={false}
        name={name}
        customInput={<DateTextInput label={label} onTyping={onTyping}/>}
        placeholderText={placeholder + " " + DATE_PICKER_EXAMPLE}
        {...pickerProps}
        {...DATE_PICKER_PROPS}
        ref={picker}
        portalId="root-portal"
      />
      {/*{error && <div className={"error-line"}>{error.message}</div>}*/}
    </div>
  )
}
export default DatePickerCoreElement;