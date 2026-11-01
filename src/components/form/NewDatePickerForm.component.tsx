import {Control, Controller, FieldValues, Path, RegisterOptions} from "react-hook-form";
import DatePicker from "react-datepicker";

import 'react-datepicker/dist/react-datepicker.css';
import React, {useState} from "react";
import moment, {Moment} from "moment";
import {LocalDate} from "local-date";
import {DATE_PICKER_PROPS, isSameDay} from "../../util/DateFormat.util";
import DateTextInput from "./DateTextInput.component";

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

  // Beim Tippen ist jeder Zwischenstand einer Korrektur ein gueltiges Datum ("15.08." -> "1.08." -> "16.08."),
  // darum gilt der Wert erst beim Schliessen des Kalenders oder beim Verlassen des Felds.
  const [pending, setPending] = useState<Date | null>(null)

  const commitDate = (field: { value: any, onChange: (value: string) => void, onBlur: () => void }) => () => {
    const date = pending
    setPending(null)
    if (date && !isSameDay(date, field.value)) {
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
          return (
          <>
            <DatePicker
              // id={String(name)} // id expects a string
              selected={pending ?? showDate(field.value)?.toDate()} // Cast to Date | null
              onChange={(date: Date | null) => date && setPending(date)}
              onCalendarClose={commitDate(field)}
              onBlur={() => {
                commitDate(field)()
                field.onBlur()
              }}
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