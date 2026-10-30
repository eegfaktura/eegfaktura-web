import {describe, expect, it} from "vitest";
import {act, fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import {FormProvider, useForm} from "react-hook-form";
import MeterFormElement from "../../../components/core/MeterForm.element";
import MeterAddressFormElement from "../../../components/core/forms/MeterAddressForm/MeterAddressForm.element";
import {Metering} from "../../../models/meteringpoint.model";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import {Eeg} from "../../../models/eeg.model";
import "../../../util/I18n";

// Energy direction and offline registration are input like any field: they make the form dirty, so leaving
// „Zählpunkt hinzufügen“ asks (review PR #244).

const ctx = {
  eeg: {area: "LOCAL", allocationMode: "DYNAMIC"} as unknown as Eeg,
  isAdmin: () => true, isOwner: () => false, isUser: () => false,
} as unknown as EegState

const Form = () => {
  const methods = useForm<Metering>({defaultValues: {
    status: "INIT", processState: "NEW", participantId: "", meteringPoint: "", direction: "CONSUMPTION", activationMode: "ONLINE",
  } as Metering})
  return (
    <EegContext.Provider value={ctx}>
      <FormProvider {...methods}>
        <MeterFormElement rates={[]}/>
        <MeterAddressFormElement isOnline={true} isEditable={true} showActivationMode={true}/>
        <span data-testid="dirty">{String(methods.formState.isDirty)}</span>
      </FormProvider>
    </EegContext.Provider>
  )
}

describe("metering point form: direction and offline registration count as input (review PR #244)", () => {
  it("choosing „Erzeuger“ makes the form dirty", async () => {
    render(<Form/>)
    expect(screen.getByTestId("dirty").textContent).toBe("false")
    await act(async () => fireEvent.click(screen.getByText("Erzeuger")))
    expect(screen.getByTestId("dirty").textContent).toBe("true")
  })

  it("„Offline-Registrierung“ makes the form dirty", async () => {
    const {container} = render(<Form/>)
    const box = container.querySelector('ion-checkbox[aria-label="Offline-Registrierung"]')!
    await act(async () => { fireEvent(box, new CustomEvent("ionChange", {detail: {checked: true}})) })
    expect(screen.getByTestId("dirty").textContent).toBe("true")
  })
})
