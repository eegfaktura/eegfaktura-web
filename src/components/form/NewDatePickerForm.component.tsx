import {Control, FieldValues, Path, RegisterOptions, useController} from "react-hook-form";
import DatePicker from "react-datepicker";

import 'react-datepicker/dist/react-datepicker.css';
import React from "react";
import moment from "moment";
import {LocalDate} from "local-date";
import {DATE_PICKER_PROPS} from "../../util/DateFormat.util";
import DateTextInput from "./DateTextInput.component";
import {useDateOnLeave} from "./useDateOnLeave.hook";

// Kalenderdatum als "YYYY-MM-DD" im lokalen Kalender - so, wie der Benutzer es im
// DatePicker ausgewaehlt hat, ohne Uhrzeit und ohne Zeitzonen-Umrechnung.
export const toFormDateValue = (date: Date): string => moment(date).format("YYYY-MM-DD")

// Neues Mitglied (kein Teilspeichern): Wert setzen und das Feld gleich pruefen. Das Formular
// validiert im Modus "onBlur", bei offenem Kalender meldet react-datepicker aber kein Verlassen.
// Ohne erneute Pruefung bliebe ein vorher gesetzter Fehler ("Mandatsdatum fehlt") trotz gewaehltem
// Datum stehen.
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

  const {field, fieldState: {error}} = useController({name, control, rules})
  const value: unknown = field.value
  const stored = typeof value === 'string' ? (value ? moment(value).toDate() : undefined) : value instanceof Date ? value : undefined

  const {picker, onTyping, pickerProps} = useDateOnLeave(stored, (date) => {
    const localDate = new LocalDate(moment(date).format("YYYY-MM-DD"))
    // Ins Formular als String "YYYY-MM-DD", nicht als LocalDate: react-hook-form klont
    // die Werte in handleSubmit und macht dabei aus jedem Date (auch LocalDate) ein
    // gewoehnliches Date. Das serialisiert als UTC - lokale Mitternacht wird so zum
    // Vortag ("2026-06-03T22:00:00.000Z"), und das Backend speichert diesen Tag.
    // Ein String uebersteht das Klonen unveraendert.
    onChangePartial ? onChangePartial(localDate) : commitFormDate(field, date)
  })

  return (
    <div className="form-element">
      {/*{label && <label htmlFor={String(name)}>{label}</label>} /!* htmlFor expects a string *!/*/}
      <DatePicker
        // id={String(name)} // id expects a string
        {...pickerProps}
        onBlur={(event) => {
          pickerProps.onBlur(event)
          // with onChangePartial the form gets the date only with the answer of the server: nothing to check before
          if (!onChangePartial || !pickerProps.selected) field.onBlur()
        }}
        {...DATE_PICKER_PROPS}
        customInput={<DateTextInput label={label} onTyping={onTyping}/>}
        placeholderText="Datum wählen"
        ref={picker}
        portalId="root-portal"
        {...rest} // Pass any other DatePicker props
      />
      {error && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '5px' }}>{error.message}</p>}
    </div>
  );
};

export default DatePickerInput;