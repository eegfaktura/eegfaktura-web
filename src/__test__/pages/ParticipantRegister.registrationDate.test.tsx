import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter, RouteComponentProps} from "react-router";
import {useFormContext} from "react-hook-form";
import {renderWithProviders} from "../test-utils";
import {Metering} from "../../models/meteringpoint.model";
import "../../util/I18n";
import {tomorrowDay} from "../../components/form/useRegistrationWindow.hook";

// platform#272: a new member of an online community keeps the requested day of each metering point; before, every
// metering point got „Mitglied seit“. Offline communities keep „Mitglied seit“.
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonToast: () => [vi.fn()],
}))
const online = vi.hoisted(() => ({value: true}))
vi.mock("../../store/hook/Eeg.provider", () => ({
  useTenant: () => ({tenant: "RC100100"}), useOnlineState: () => online.value, useEegArea: () => "LOCAL"}))
const createParticipant = vi.hoisted(() => vi.fn())
vi.mock("../../store/participant", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../store/participant")>()),
  createParticipant,
}))
vi.mock("../../components/ParticipantRegisterCommonPane.component", () => ({default: () => <div/>}))
// one button enters a metering point, the other a requested day, like the form would
vi.mock("../../components/core/MeterForm.element", () => ({
  default: () => {
    const {setValue} = useFormContext<Metering>()
    return <>
      <button type="button" onClick={() => setValue("meteringPoint", "AT0030000000000000000000000000001", {shouldDirty: true})}>eingeben</button>
      <button type="button" onClick={() => setValue("registeredSince", "2027-01-01" as unknown as Date, {shouldDirty: true})}>Termin</button>
    </>
  }
}))
vi.mock("../../components/core/forms/MeterAddressForm/MeterAddressForm.element", () => ({default: () => <div/>}))

import ParticipantRegisterPage from "../../pages/ParticipantRegister.page";

const setup = () => renderWithProviders(
  <MemoryRouter><ParticipantRegisterPage {...({history: {replace: vi.fn()}} as unknown as RouteComponentProps)}/></MemoryRouter>)
const addMeter = async (withDay: boolean) => {
  fireEvent.click(screen.getByText("Zählpunkt hinzufügen"))
  fireEvent.click(screen.getByText("eingeben"))
  if (withDay) fireEvent.click(screen.getByText("Termin"))
  await act(async () => fireEvent.click(screen.getByText("Hinzufügen")))
  await act(async () => fireEvent.submit(document.getElementById("submit-register-participant")!))
}
const sent = () => createParticipant.mock.lastCall![0].participant

describe("register page: the requested day of the metering points (platform#272)", () => {
  beforeEach(() => {
    createParticipant.mockReset()
    createParticipant.mockImplementation(() => () => ({unwrap: () => Promise.resolve()}))
  })
  afterEach(() => cleanup())

  it("online: the chosen day goes out, not „Mitglied seit“", async () => {
    online.value = true
    setup()
    await addMeter(true)
    expect(sent().meters[0].registeredSince).toBe("2027-01-01")
  })

  it("online without a choice: tomorrow", async () => {
    online.value = true
    setup()
    await addMeter(false)
    expect(sent().meters[0].registeredSince).toBe(tomorrowDay())
  })

  it("offline: „Mitglied seit“, as before", async () => {
    online.value = false
    setup()
    await addMeter(true)
    expect(sent().meters[0].registeredSince).toBe(sent().participantSince)
  })
})
