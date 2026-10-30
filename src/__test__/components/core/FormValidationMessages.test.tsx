import {describe, expect, it} from "vitest";
import {act, fireEvent, render} from "@testing-library/react";
import React, {PropsWithChildren} from "react";
import {FormProvider, useForm} from "react-hook-form";
import {Provider} from "react-redux";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../../store";
import "../../../util/I18n";
import MeterFormElement from "../../../components/core/MeterForm.element";
import MemberFormComponent from "../../../components/core/MemberForm.component";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import {Eeg} from "../../../models/eeg.model";
import {EegParticipant} from "../../../models/members.model";

// platform#228 step 2: a failed rule showed an empty message (participation/allocation factor) or no message at all
// (street: the rule sat on billingAddress.street, the message was read from residentAddress.street)

const ctx = (allocationMode: string) => ({
  eeg: {area: "LOCAL", allocationMode} as unknown as Eeg,
  isFetching: false,
  getTenants: () => [],
  isAdmin: () => true,
  isOwner: () => false,
  isUser: () => false,
  setTenant: () => {},
  refresh: async () => 1
} as unknown as EegState)

const MeterForm = ({allocationMode, values, field}: { allocationMode: string, values: object, field: string }) => {
  const methods = useForm({defaultValues: {status: "INIT", processState: "NEW", meteringPoint: "", direction: "CONSUMPTION", ...values}})
  return (
    <EegContext.Provider value={ctx(allocationMode)}>
      <FormProvider {...methods}>
        <MeterFormElement rates={[]}/>
        <button onClick={() => methods.trigger(field as any)}>check</button>
      </FormProvider>
    </EegContext.Provider>
  )
}

const errorLines = (container: HTMLElement) => Array.from(container.querySelectorAll(".error-line")).map(e => e.textContent)

describe("MeterForm: factor out of range shows a message", () => {
  it("participation factor above 100", async () => {
    const {container, getByText} = render(<MeterForm allocationMode="DYNAMIC" values={{partFact: 150}} field="partFact"/>)
    await act(async () => fireEvent.click(getByText("check")))
    expect(errorLines(container)).toEqual(["Teilnahmefaktor muss größer als 0 und höchstens 100 sein!"])
  })

  it("allocation factor above 100", async () => {
    const {container, getByText} = render(<MeterForm allocationMode="STATIC" values={{partFact: 100, allocationFactor: 120}} field="allocationFactor"/>)
    await act(async () => fireEvent.click(getByText("check")))
    expect(errorLines(container)).toEqual(["Verteilungsfaktor muss größer als 0 und höchstens 100 sein!"])
  })

  it("a valid factor shows no message", async () => {
    const {container, getByText} = render(<MeterForm allocationMode="DYNAMIC" values={{partFact: 100}} field="partFact"/>)
    await act(async () => fireEvent.click(getByText("check")))
    expect(errorLines(container)).toEqual([])
  })
})

describe("MemberForm: empty street shows a message", () => {
  const participant = {
    id: "p1", participantNumber: "1", firstname: "Anna", lastname: "Muster", businessRole: "EEG_PRIVATE",
    billingAddress: {street: "Hauptstraße", streetNumber: "1", zip: "4020", city: "Linz"},
    residentAddress: {street: "Hauptstraße", streetNumber: "1", zip: "4020", city: "Linz"},
    contact: {email: "anna@example.org", phone: ""}, accountInfo: {iban: "", owner: "", sepaDirectDebit: "NONE"},
    optionals: {}, meters: [], status: "ACTIVE", role: "EEG_USER",
  } as unknown as EegParticipant

  const Wrapper = ({children}: PropsWithChildren) =>
    <Provider store={configureStore({reducer})}>
      <EegContext.Provider value={ctx("DYNAMIC")}>{children}</EegContext.Provider>
    </Provider>

  it("clearing the street shows „Straße fehlt!“", async () => {
    const {container} = render(<MemberFormComponent participant={participant} rates={[]} formId="f" onSubmit={() => {}}
                                                    onSubmitPartial={() => {}}/>, {wrapper: Wrapper})
    const street = container.querySelector('ion-input[name="billingAddress.street"]') as any
    await act(async () => {
      street.value = ""
      fireEvent(street, new CustomEvent("ionInput", {detail: {value: ""}}))
    })
    expect(errorLines(container)).toEqual(["Straße fehlt!"])
  })
})
