import {ReactDatePickerCustomHeaderProps} from "react-datepicker";
import deAT from "date-fns/locale/de-AT";

import "./DatePicker.theme.scss"

// Month names of the header ("Jänner" … "Dezember").
export const MONTH_NAMES = Array.from({length: 12}, (_, i) => deAT.localize!.month(i) as string)

const yearRange = (shown: number) => {
  const first = Math.min(2020, shown)
  const last = Math.max(new Date().getFullYear() + 1, shown)
  return Array.from({length: last - first + 1}, (_, i) => first + i)
}

// The one header of all date pickers (part of DATE_PICKER_PROPS): arrows at the edges, year and month to jump to.
export const renderDatePickerHeader = ({date, changeYear, changeMonth, decreaseMonth, increaseMonth,
                                         prevMonthButtonDisabled, nextMonthButtonDisabled}: ReactDatePickerCustomHeaderProps) => (
  <div className="date-picker-header">
    {/* type="button": a picker without portal sits inside a form */}
    <button type="button" aria-label="Voriger Monat" onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>{"<"}</button>
    <select name="header_year" aria-label="Jahr" value={date.getFullYear()} onChange={({target: {value}}) => changeYear(Number(value))}>
      {yearRange(date.getFullYear()).map(year => <option key={year} value={year}>{year}</option>)}
    </select>
    <select name="header_month" aria-label="Monat" value={MONTH_NAMES[date.getMonth()]} onChange={({target: {value}}) => changeMonth(MONTH_NAMES.indexOf(value))}>
      {MONTH_NAMES.map(month => <option key={month} value={month}>{month}</option>)}
    </select>
    <button type="button" aria-label="Nächster Monat" onClick={increaseMonth} disabled={nextMonthButtonDisabled}>{">"}</button>
  </div>
)
