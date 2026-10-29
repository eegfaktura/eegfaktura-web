import {afterEach, describe, expect, it} from "vitest";
import {cleanup, render} from "@testing-library/react";
import {useForm} from "react-hook-form";
import NumberInputForm from "../../../components/form/NumberInput.component";

const Form = ({value}: { value: number | undefined }) => {
  const {control} = useForm<{ amount?: number }>({defaultValues: {amount: value}})
  return <NumberInputForm label="Betrag" control={control} name="amount"/>
}

const shown = (container: HTMLElement) => (container.querySelector("ion-input") as any)?.value

describe("NumberInputForm shows the stored value (261005-ca5)", () => {
  afterEach(() => cleanup())

  it("shows 0 as 0, not as an empty field", () => {
    const {container} = render(<Form value={0}/>)
    expect(shown(container)).toBe("0")
  })

  it("shows a decimal with a comma", () => {
    const {container} = render(<Form value={12.5}/>)
    expect(shown(container)).toBe("12,5")
  })

  it("leaves a value that is no number empty instead of showing NaN", () => {
    const {container} = render(<Form value={NaN}/>)
    expect(shown(container)).toBe("")
  })

  it("leaves a field without a value empty", () => {
    const {container} = render(<Form value={undefined}/>)
    expect(shown(container)).toBe("")
  })
})
