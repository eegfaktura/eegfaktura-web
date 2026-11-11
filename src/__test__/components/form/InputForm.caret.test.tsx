import {describe, expect, it} from "vitest";
import {act, fireEvent, render} from "@testing-library/react";
import React from "react";
import {useForm} from "react-hook-form";
import InputFormComponent from "../../../components/form/InputForm.component";

// Renaming a tariff: after the first typed character the caret jumped to the end of the field. The input wrote the
// form's value back into the Ionic field on every render; a write that differs from what the field shows at that
// moment moves the caret. It now writes only when the form's value differs from the field (reset, other record).

const Form = () => {
  const {control, reset} = useForm<{ name: string }>({defaultValues: {name: "Beitritt weiterer ZP"}, mode: "all"})
  return (
    <>
      <InputFormComponent label="Tarifbezeichnung" control={control} name="name" type="text"/>
      <button onClick={() => reset({name: "Anderer Tarif"})}>reset</button>
    </>
  )
}

// records every value the component writes into the ion-input while the test types
const spyOnValue = (el: any, shown: string) => {
  const writes: string[] = []
  let value = shown
  Object.defineProperty(el, "value", {
    get: () => value,
    set: (v) => { writes.push(String(v)); value = v },
    configurable: true,
  })
  // Ionic's React wrapper hands string props over as attributes
  const setAttribute = el.setAttribute.bind(el)
  el.setAttribute = (name: string, v: string) => {
    if (name === "value") writes.push(v)
    setAttribute(name, v)
  }
  const type = (next: string) => {
    value = next
    fireEvent(el, new CustomEvent("ionInput", {detail: {value: next}}))
  }
  return {writes, type}
}

describe("InputForm: typing keeps the caret where it is", () => {
  it("shows the form's value when it opens", () => {
    const {container} = render(<Form/>)
    const el = container.querySelector('ion-input[name="name"]') as any
    expect(el.value).toBe("Beitritt weiterer ZP")
  })

  it("writes nothing into the field while typing", async () => {
    const {container} = render(<Form/>)
    const el = container.querySelector('ion-input[name="name"]') as any
    const {writes, type} = spyOnValue(el, "Beitritt weiterer ZP")

    await act(async () => type("Beitritt2 weiterer ZP"))

    expect(writes).toEqual([])
    expect(el.value).toBe("Beitritt2 weiterer ZP")
  })

  it("shows a new value from the form, e.g. after a reset", async () => {
    const {container, getByText} = render(<Form/>)
    const el = container.querySelector('ion-input[name="name"]') as any
    const {writes} = spyOnValue(el, "Beitritt weiterer ZP")

    await act(async () => fireEvent.click(getByText("reset")))

    expect(writes).toEqual(["Anderer Tarif"])
  })
})
