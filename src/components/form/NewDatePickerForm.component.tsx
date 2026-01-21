import {Control, Controller, FieldValues, Path, RegisterOptions} from "react-hook-form";
import DatePicker, {ReactDatePickerCustomHeaderProps} from "react-datepicker";

import 'react-datepicker/dist/react-datepicker.css';
import React, {forwardRef} from "react";
import {IonInput, IonItem, IonLabel} from "@ionic/react";
import moment, {Moment} from "moment";
import {LocalDate} from "local-date";

// --- Custom IonInput Component for DatePicker ---
interface CustomIonInputProps {
  value?: string;
  onClick?: () => void;
  label?: string;
  id?: string;
  // react-datepicker also passes 'readOnly' and 'disabled'
  readOnly?: boolean;
  disabled?: boolean;
}

// We use forwardRef because react-datepicker needs a ref to the input element
const CustomIonInput = forwardRef<HTMLIonInputElement, CustomIonInputProps>(
  ({ value, onClick, label, id, readOnly, disabled }, ref) => (
    <>
      {/*{label && <IonLabel position="stacked">{label}</IonLabel>}*/}
      <IonInput
        value={value}
        label={label}
        onClick={onClick}
        readonly={readOnly}
        disabled={disabled}
        ref={ref} // Pass the ref to IonInput
        placeholder="Select Date"
        fill="outline"
        labelPlacement={"floating"}
      />
    </>
  )
);

const customHeader = ({
                        date,
                        changeYear,
                        changeMonth,
                        decreaseMonth,
                        increaseMonth,
                        prevMonthButtonDisabled,
                        nextMonthButtonDisabled,
                      }: ReactDatePickerCustomHeaderProps) => {
  const getYear = (date: Date) => date.getFullYear()
  const getMonth = (date: Date) => date.getMonth()
  const range = (start: number, end: number) => Array.from(
    Array(Math.abs(end - start) + 1),
    (_, i) => start + i
  );

  const years = range(2020, getYear(new Date()) + 1);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
  <div
    style={{
      margin: 10,
      display: "flex",
      justifyContent: "space-between",
    }}
  >
    <button style={{color: "inherit", background: "transparent"}} onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>
      {"<"}
    </button>
    <select name="header_year" style={{background: "transparent", margin:"1px", padding: "3px 2px"}}
            value={getYear(date)}
            onChange={({ target: { value } }) => changeYear(Number(value))}
    >
      {years.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>

    <select name="header_month" style={{background: "transparent", margin:"1px", padding: "3px 2px"}}
            value={months[getMonth(date)]}
            onChange={({ target: { value } }) =>
              changeMonth(months.indexOf(value))
            }
    >
      {months.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>

    <button style={{color: "inherit", background: "transparent"}} onClick={increaseMonth} disabled={nextMonthButtonDisabled}>
      {">"}
    </button>
  </div>
)}

// Define the props for the DatePickerInput component
interface DatePickerInputProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>; // Use Path<TFieldValues> here
  control: Control<TFieldValues>;
  label?: string;
  rules?: RegisterOptions;
  // You can extend this with specific react-datepicker props if needed
  // For now, using React.ComponentProps<typeof DatePicker> would be too broad
  // but you can add specific ones like:
  minDate?: Date;
  maxDate?: Date;
  showTimeSelect?: boolean;
  dateFormat?: string;
  placeholderText?: string;
  onChangePartial?: (date: LocalDate  | null) => void;
  // Add any other props you want to explicitly pass to DatePicker
}

const DatePickerInput = <TFieldValues extends FieldValues>({
                                                             name,
                                                             control,
                                                             label,
                                                             rules,
                                                             onChangePartial,
                                                             ...rest
                                                           }: DatePickerInputProps<TFieldValues>) => {

  const onDateChange = (change: (...event: any[]) => void) => (date: Date | null) => {
    if (date) {
      const localDate = new LocalDate(moment(date).format("YYYY-MM-DD"))
      onChangePartial ? onChangePartial(localDate) : change(localDate)
    }
  }

  const showDate = (value: any): Moment | null => {
    return typeof value === 'string' ? moment(value) : value instanceof Date ? moment(value) : null
  }

  return (
    <div className="form-element">
      {/*{label && <label htmlFor={String(name)}>{label}</label>} /!* htmlFor expects a string *!/*/}
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => {
          // Ensure field.value is always treated as Date | null
          const selectedDate = field.value as Date | null;

          // Format the date for display in the IonInput
          const displayValue = (selectedDate instanceof Date)
            ? 'Hallo' /*selectedDate.toLocaleDateString('de-DE', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            })*/
            : ''; // If null, display an empty string

          return (
          <>
            <DatePicker
              // id={String(name)} // id expects a string
              renderCustomHeader={customHeader}
              selected={showDate(field.value)?.toDate()} // Cast to Date | null
              onChange={onDateChange(field.onChange)}
              onBlur={field.onBlur}
              dateFormat="MMMM d, yyyy"
              customInput={
                <CustomIonInput
                  label={label}
                  // value={displayValue} // Format value for display
                />
              }
              portalId="root-portal"
              {...rest} // Pass any other DatePicker props
            />
            {error && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '5px' }}>{error.message}</p>}
          </>
        )}}
      />
    </div>
  );
};

export default DatePickerInput;