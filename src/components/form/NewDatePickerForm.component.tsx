import {Control, Controller, FieldValues, Path, RegisterOptions} from "react-hook-form";
import DatePicker from "react-datepicker";

import 'react-datepicker/dist/react-datepicker.css';
import React from "react";
import moment, {Moment} from "moment";
import {LocalDate} from "local-date";
import {DATE_PICKER_PROPS} from "../../util/DateFormat.util";
import DateTextInput from "./DateTextInput.component";

// Kalenderdatum als "YYYY-MM-DD" im lokalen Kalender - so, wie der Benutzer es im
// DatePicker ausgewaehlt hat, ohne Uhrzeit und ohne Zeitzonen-Umrechnung.
export const toFormDateValue = (date: Date): string => moment(date).format("YYYY-MM-DD")

// Neues Mitglied (kein Teilspeichern): Wert setzen und das Feld gleich pruefen. Das Formular
// validiert im Modus "onBlur", aber CustomIonInput reicht onBlur von react-datepicker nicht weiter -
// react-hook-form sieht fuer dieses Feld also nie ein Verlassen. Ohne erneute Pruefung bliebe ein
// vorher gesetzter Fehler ("Mandatsdatum fehlt") trotz gewaehltem Datum stehen.
export const commitFormDate = (field: { onChange: (value: string) => void, onBlur: () => void }, date: Date) => {
  field.onChange(toFormDateValue(date))
  field.onBlur()
}

// Define the props for the DatePickerInput component
interface DatePickerInputProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>; // Use Path<TFieldValues> here
  control: Control<TFieldValues>;
  label?: string;
  rules?: Omit<RegisterOptions<TFieldValues, Path<TFieldValues>>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'>;
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

  const onDateChange = (field: { onChange: (value: string) => void, onBlur: () => void }) => (date: Date | null) => {
    if (date) {
      const localDate = new LocalDate(moment(date).format("YYYY-MM-DD"))
      // Ins Formular als String "YYYY-MM-DD", nicht als LocalDate: react-hook-form klont
      // die Werte in handleSubmit und macht dabei aus jedem Date (auch LocalDate) ein
      // gewoehnliches Date. Das serialisiert als UTC - lokale Mitternacht wird so zum
      // Vortag ("2026-06-03T22:00:00.000Z"), und das Backend speichert diesen Tag.
      // Ein String uebersteht das Klonen unveraendert.
      onChangePartial ? onChangePartial(localDate) : commitFormDate(field, date)
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
              selected={showDate(field.value)?.toDate()} // Cast to Date | null
              onChange={onDateChange(field)}
              onBlur={field.onBlur}
              {...DATE_PICKER_PROPS}
              customInput={<DateTextInput label={label}/>}
              placeholderText="Datum wählen"
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