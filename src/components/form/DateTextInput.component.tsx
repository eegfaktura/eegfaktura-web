import {ComponentProps, forwardRef} from "react";
import {IonInput} from "@ionic/react";
import {parseDateRange} from "../../util/DateFormat.util";

type DateTextInputProps = Omit<ComponentProps<typeof IonInput>, "onChange"> & {
  label?: string
  // react-datepicker's handler, it reads event.target.value
  onChange?: (event: any) => void
  // range pickers: react-datepicker reads no typed range, so a complete „01.08.2026 - 01.10.2026“ ends up here
  onRange?: (range: [Date, Date]) => void
}

// The field of a react-datepicker. React does not see the input of an IonInput, the text has to be handed over on
// ionInput. Keep it at module level: a component defined in a render is new on every render and loses the focus.
// react-datepicker overwrites a placeholder set here, use its placeholderText.
const DateTextInput = forwardRef<HTMLIonInputElement, DateTextInputProps>(function DateTextInput({onChange, onRange, ...rest}, ref) {
  return (
    <IonInput
      {...rest}
      onIonInput={(event) => {
        onChange && onChange(event)
        const range = onRange && parseDateRange(event.detail.value ?? "")
        range && onRange!(range)
      }}
      fill="outline"
      labelPlacement={"floating"}
      ref={ref}
    />
  )
})

export default DateTextInput
