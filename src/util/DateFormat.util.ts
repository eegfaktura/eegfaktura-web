import moment from "moment";
import {registerLocale, setDefaultLocale} from "react-datepicker";
import deAT from "date-fns/locale/de-AT";

// One date notation for the screen (platform#228): "28.10.2026" and "28.10.2026 14:05". For display only - values
// sent to the API or written into files keep their own format (e.g. "YYYY-MM-DD").

type DateInput = Date | number | string

export const formatDate = (d: DateInput): string => moment(d).format("DD.MM.YYYY")

export const formatDateTime = (d: DateInput): string => moment(d).format("DD.MM.YYYY HH:mm")

// react-datepicker: Austrian German month and weekday names, week starts on Monday, and the field shows and reads
// "28.10.2026" instead of "October 28, 2026". Every date picker imports this module, so the locale is registered
// before the first picker renders.
export const DATE_PICKER_LOCALE = "de-AT"
export const DATE_PICKER_FORMAT = "dd.MM.yyyy"
export const DATE_PICKER_EXAMPLE = "z.B. 02.04.2024"

registerLocale(DATE_PICKER_LOCALE, deAT)
setDefaultLocale(DATE_PICKER_LOCALE)

// Month names for the custom year/month header of the date pickers ("Jänner" … "Dezember").
export const MONTH_NAMES = Array.from({length: 12}, (_, i) => deAT.localize!.month(i) as string)
