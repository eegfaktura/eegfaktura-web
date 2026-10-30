import {describe, expect, it, vi} from "vitest";
import React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import {Controller} from "react-hook-form";

// The reason input of "Datenfreigabe aufheben" with the real InputForm: the hint that the text goes to the grid operator
// and into the history, and a counter of the cleaned text (as the backend counts it) with the limit of 50 characters.
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [vi.fn()],
  useIonToast: () => [vi.fn()],
}))
const select = vi.hoisted(() => ({control, name, rules, multiple}: any) =>
  <Controller control={control} name={name} rules={rules} render={({field}) =>
    <input aria-label={name} value={(multiple ? (field.value ?? []).join(",") : field.value) ?? ""}
           onChange={e => field.onChange(multiple ? e.target.value.split(",") : e.target.value)}/>}/>)
vi.mock("../../../components/form/BasicSelect.component", () => ({BasicSelectComponent: select}))
vi.mock("../../../components/form/SelectForm.component", () => ({default: select}))
vi.mock("react-datepicker", () => ({default: () => null}))

import "../../../util/I18n";
import {Eeg, EdaProcess} from "../../../models/eeg.model";
import ProcessRevokeMeteringpointComponent from "../../../components/processDetails/ProcessRevokeMeteringpoint.component";

const eeg = {id: "te100200", communityId: "AT00999900000TC100200000000000001"} as unknown as Eeg
const process = {name: "Datenfreigabe aufheben", description: "", enabled: true} as EdaProcess

const renderForm = () => {
  const {container} = render(<ProcessRevokeMeteringpointComponent eeg={eeg} meters={[]} participants={[]}
                                                                  edaProcess={process}/>)
  const input = container.querySelector('ion-input[name="reason"]') as any
  const type = (value: string) => {
    input.value = value
    fireEvent(input, new CustomEvent("ionInput", {detail: {value}}))
  }
  return {type}
}

describe("Datenfreigabe aufheben: Begründung", () => {
  it("says that the reason goes to the grid operator and into the history", () => {
    renderForm()
    expect(screen.getByText("Wird an den Netzbetreiber gesendet und in der Historie gespeichert – bitte keine "
      + "personenbezogenen Daten eintragen.")).toBeTruthy()
    expect(screen.getByTestId("reason-counter").textContent).toBe("0/50")
  })

  it("counts the cleaned text: blanks at the ends and line breaks do not count extra, an emoji is one character", () => {
    const {type} = renderForm()
    type("  " + "ä".repeat(48) + "\n😀  ")
    expect(screen.getByTestId("reason-counter").textContent).toBe("50/50")
    expect(screen.queryByText("Höchstens 50 Zeichen.")).toBeNull()
  })

  it("shows the limit above 50 characters", () => {
    const {type} = renderForm()
    type("x".repeat(51))
    expect(screen.getByTestId("reason-counter").textContent).toBe("51/50")
    expect(screen.getByText("Höchstens 50 Zeichen.")).toBeTruthy()
  })
})
