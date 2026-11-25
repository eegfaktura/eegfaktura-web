import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter} from "react-router";
import {renderWithProviders} from "../../test-utils";
import "../../../util/I18n";

// Support report 25.11.2026: adding a metering point to an existing member, „Registrieren“ stayed grey while the
// address was typed by hand; only „Adresse vom Besitzer übernehmen“ enabled it.

vi.mock("../../../store/hook/Eeg.provider", () => ({
  useTenant: () => ({tenant: "RC100100"}),
  useOnlineState: () => true,
  useAccessGroups: () => ({isAdmin: () => true}),
  useEegArea: () => "LOCAL",
  useEegAllocation: () => "DYNAMIC",
}))
import AddMeterPaneComponent from "../../../components/participantPane/AddMeterPane.component";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import {initialState as participantInitial} from "../../../store/participant/states/participant.state";

const participant = {id: "p1", firstname: "Anna", lastname: "Muster",
  billingAddress: {street: "Weg", streetNumber: "1", zip: "4020", city: "Linz"}} as any

const setup = () => {
  const r = renderWithProviders(
    <MemoryRouter>
      <ParticipantContext.Provider value={{setShowAddMeterPane: vi.fn(), unsaved: {}, setUnsaved: vi.fn()} as any}>
        <AddMeterPaneComponent/>
      </ParticipantContext.Provider>
    </MemoryRouter>,
    {preloadedState: {participant: {...participantInitial, selectedParticipant: participant}}})
  const type = async (name: string, value: string) => {
    const field = r.container.querySelector(`ion-input[name="${name}"]`) as any
    field.value = value
    await act(async () => { fireEvent(field, new CustomEvent("ionInput", {detail: {value}})) })
    await act(async () => { fireEvent(field, new CustomEvent("ionChange", {detail: {value}})) })
    await act(async () => { fireEvent(field, new CustomEvent("ionBlur")) })
  }
  return {...r, type}
}

const registerDisabled = () => (screen.getByText("Registrieren").closest("ion-button") as HTMLIonButtonElement).disabled

describe("adding a metering point: the address typed by hand", () => {
  it("„Registrieren“ is enabled once metering point and address are filled in", async () => {
    const {type} = setup()
    expect(registerDisabled()).toBe(true)
    await type("meteringPoint", "AT0030000000000000000000000000001")
    await type("street", "Hauptstraße")
    await type("streetNumber", "5")
    await type("zip", "4020")
    await type("city", "Linz")
    expect(registerDisabled()).toBe(false)
  })

  it("stays grey while a required field is missing or the metering point is invalid", async () => {
    const {type} = setup()
    await type("meteringPoint", "AT0030000000000000000000000000001")
    await type("street", "Hauptstraße")
    await type("streetNumber", "5")
    await type("zip", "4020")
    expect(registerDisabled()).toBe(true) // no city yet
    await type("city", "Linz")
    expect(registerDisabled()).toBe(false)
    await type("meteringPoint", "AT00300")
    expect(registerDisabled()).toBe(true)
  })
})
