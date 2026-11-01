import {KeyboardEvent, useRef, useState} from "react";
import DatePicker from "react-datepicker";
import {isSameDay} from "../../util/DateFormat.util";

// The date of a single picker counts when the picker is left: when the calendar closes, or when the field is left
// while it is closed. While typing, every step of a correction can be a valid date („15.08.“, „1.08.“, „16.08.“) and
// reaching a field with Tab opens and closes the calendar. So nothing is saved before leaving, only a different day
// is saved, and text that is no date at the end („15.13.2026“) falls back to the stored date. Escape discards.
// Spread pickerProps on the DatePicker and hand onTyping to DateTextInput.
export const useDateOnLeave = (stored: Date | null | undefined, save: (date: Date) => void) => {
  const picker = useRef<DatePicker>(null)
  const [pending, setPending] = useState<Date | null>(null)
  // the last saved date: stored follows late (answer of the server) or never (callers holding it in a ref)
  const [saved, setSaved] = useState(stored)

  // a new stored date from outside counts at once
  const storedTime = stored?.getTime()
  const [seenTime, setSeenTime] = useState(storedTime)
  if (!Object.is(storedTime, seenTime)) {   // an invalid date is NaN
    setSeenTime(storedTime)
    setSaved(stored)
  }

  const commit = () => {
    if (pending && !isSameDay(pending, saved)) {
      setSaved(pending)
      save(pending)
    }
    setPending(null)
  }

  return {
    picker,
    onTyping: () => setPending(null),
    pickerProps: {
      selected: pending ?? saved ?? undefined,
      onChange: (date: Date | null) => { date && setPending(date) },
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
          setPending(null)
          // closes the calendar only, not the dialog around it (Ionic listens on the document)
          picker.current?.isCalendarOpen() && event.stopPropagation()
        }
      },
      onCalendarClose: commit,
      onBlur: (event: {target: EventTarget | null}) => {
        // switching to another window blurs the field as well, without leaving it
        if (document.activeElement === event.target) return
        commit()
        // the picker forgets typed text only on closing, also when it is closed already
        picker.current?.setOpen(false, true)
      },
    },
  }
}
