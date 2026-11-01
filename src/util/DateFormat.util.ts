import moment from "moment";
import {registerLocale, setDefaultLocale} from "react-datepicker";
import deAT from "date-fns/locale/de-AT";
import {renderDatePickerHeader} from "../components/form/DatePickerHeader.component";

// One date notation for the screen (platform#228): "28.10.2026" and "28.10.2026 14:05". For display only - values
// sent to the API or written into files keep their own format (e.g. "YYYY-MM-DD").

type DateInput = Date | number | string

export const formatDate = (d: DateInput): string => moment(d).format("DD.MM.YYYY")

export const formatDateTime = (d: DateInput): string => moment(d).format("DD.MM.YYYY HH:mm")

// react-datepicker: Austrian German month and weekday names, week starts on Monday, and the field shows and reads
// "28.10.2026" instead of "October 28, 2026". strictParsing: a typed "05.13.2026" is rejected instead of being read
// by the Date fallback as 13 May. Typed days and months may omit the leading zero ("1.2.2026", "01.2.2026"); the
// field always shows the first format. fixedHeight: always six week rows, so the arrows of the header stay in place
// from month to month, also when the calendar opens above the field. Spread DATE_PICKER_PROPS on every picker.
export const DATE_PICKER_LOCALE = "de-AT"
export const DATE_PICKER_FORMAT = "dd.MM.yyyy"
export const DATE_PICKER_EXAMPLE = "z.B. 02.04.2024"
export const DATE_PICKER_PROPS = {
  dateFormat: [DATE_PICKER_FORMAT, "d.M.yyyy", "d.MM.yyyy", "dd.M.yyyy"],
  locale: DATE_PICKER_LOCALE,
  strictParsing: true,
  fixedHeight: true,
  renderCustomHeader: renderDatePickerHeader,
}

// the formats of the picker, in the notation of moment
const TYPED_FORMATS = DATE_PICKER_PROPS.dateFormat.map(format => format.replace(/d/g, "D").replace(/y/g, "Y"))

// A picker hands back a Date, the form may hold a string: only a different day counts as a change.
export const isSameDay = (a?: DateInput | null, b?: DateInput | null) => !!a && !!b && moment(a).isSame(b, "day")

// A typed range „01.08.2026 - 01.10.2026“; null while it is incomplete or invalid, or when it ends before it starts.
export const parseDateRange = (text: string): [Date, Date] | null => {
  const parts = text.split(" - ")
  if (parts.length !== 2) return null
  const [start, end] = parts.map(part => moment(part.trim(), TYPED_FORMATS, true))
  return start.isValid() && end.isValid() && !end.isBefore(start) ? [start.toDate(), end.toDate()] : null
}

// Called once at app start (main.tsx) and in the test setup, before the first picker renders.
export const registerDatePickerLocale = () => {
  registerLocale(DATE_PICKER_LOCALE, deAT)
  setDefaultLocale(DATE_PICKER_LOCALE)
}
