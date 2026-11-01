import {ComponentProps, FocusEventHandler, forwardRef, KeyboardEventHandler, MouseEventHandler, useImperativeHandle, useRef} from "react";
import {IonInput} from "@ionic/react";
import {parseDateRange} from "../../util/DateFormat.util";

type DateTextInputProps = Pick<ComponentProps<typeof IonInput>, "value" | "label" | "placeholder" | "name" | "disabled" | "style"> & {
  readOnly?: boolean
  onClick?: MouseEventHandler
  onFocus?: FocusEventHandler
  onBlur?: FocusEventHandler
  onKeyDown?: KeyboardEventHandler
  // react-datepicker's handler, it reads event.target.value
  onChange?: (event: any) => void
  // range pickers: react-datepicker reads no typed range, so a complete „01.08.2026 - 01.10.2026“ ends up here
  onRange?: (range: [Date, Date]) => void
}

// The field of a react-datepicker. React does not see the input of an IonInput, the text has to be handed over on
// ionInput. Keep it at module level: a component defined in a render is new on every render and loses the focus.
// react-datepicker overwrites a placeholder set here, use its placeholderText. Hand over props one by one: it sets
// many of them to undefined, and the IonInput writes those as id="undefined" and title="undefined" on the element.
const DateTextInput = forwardRef<Pick<HTMLElement, "focus" | "blur">, DateTextInputProps>(function DateTextInput(
  {value, label, placeholder, name, disabled, readOnly, style, onClick, onFocus, onBlur, onKeyDown, onChange, onRange}, ref) {
  const input = useRef<HTMLIonInputElement>(null)

  // react-datepicker moves the focus through this ref; the IonInput itself cannot hold the focus, its native input can
  useImperativeHandle(ref, () => ({
    focus: () => { input.current?.setFocus() },
    blur: () => { input.current?.getInputElement().then(native => native.blur()) },
  }), [])

  return (
    <IonInput
      value={value}
      label={label}
      placeholder={placeholder}
      name={name}
      disabled={disabled}
      readonly={readOnly}
      style={style}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onIonInput={(event) => {
        onChange && onChange(event)
        const range = onRange && parseDateRange(event.detail.value ?? "")
        range && onRange!(range)
      }}
      fill="outline"
      labelPlacement={"floating"}
      ref={input}
    />
  )
})

export default DateTextInput
