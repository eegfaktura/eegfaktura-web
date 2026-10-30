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

// Energy direction is input like any field: it makes the form dirty, so leaving „Zählpunkt hinzufügen“ asks
// (review PR #244). The offline registration is gone (decision 2026-10-30): the form offers no way to change it.

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
        <MeterAddressFormElement isOnline={true} isEditable={true}/>
        <span data-testid="dirty">{String(methods.formState.isDirty)}</span>
      </FormProvider>
    </EegContext.Provider>
  )
}

describe("metering point form: direction counts as input (review PR #244), no offline registration", () => {
  it("choosing „Erzeuger“ makes the form dirty", async () => {
    render(<Form/>)
    expect(screen.getByTestId("dirty").textContent).toBe("false")
    await act(async () => fireEvent.click(screen.getByText("Erzeuger")))
    expect(screen.getByTestId("dirty").textContent).toBe("true")
  })

  it("offers neither „Offline-Registrierung“ nor „Aktivierungs-Code“", () => {
    const {container} = render(<Form/>)
    expect(screen.queryByText(/Offline-Registrierung/)).not.toBeInTheDocument()
    expect(container.querySelector('ion-checkbox[aria-label="Offline-Registrierung"]')).toBeNull()
    expect(screen.queryByText(/Aktivierungs-Code/)).not.toBeInTheDocument()
    expect(container.querySelector('[name="activationCode"]')).toBeNull()
  })
})
