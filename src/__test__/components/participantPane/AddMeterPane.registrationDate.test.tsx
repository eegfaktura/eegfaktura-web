import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter} from "react-router";
import {renderWithProviders} from "../../test-utils";
import "../../../util/I18n";

// platform#272: a metering point added to a member of an online community sends the requested day as registeredSince;
// before, the backend set „today“ and the registration started tomorrow whatever „Aktiv ab“ said.
const online = vi.hoisted(() => ({value: true}))
vi.mock("../../../store/hook/Eeg.provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../store/hook/Eeg.provider")>()),
  useTenant: () => ({tenant: "RC100100"}),
  useOnlineState: () => online.value,
  useAccessGroups: () => ({isAdmin: () => true}),
  useEegArea: () => "LOCAL",
  useEegAllocation: () => "DYNAMIC",
}))
const registerMeteringpoint = vi.hoisted(() => vi.fn())
vi.mock("../../../store/participant", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../store/participant")>()),
  registerMeteringpoint,
}))
import {Api} from "../../../service";
import {EegService} from "../../../service/eeg.service";
import {AuthService} from "../../../service/auth.service";
import AddMeterPaneComponent from "../../../components/participantPane/AddMeterPane.component";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import {initialState as participantInitial} from "../../../store/participant/states/participant.state";
import {tomorrow, tomorrowDay} from "../../../components/form/useRegistrationWindow.hook";
import moment from "moment";

const participant = {id: "p1", firstname: "Anna", lastname: "Muster",
  billingAddress: {street: "Weg", streetNumber: "1", zip: "4020", city: "Linz"}} as any

const setup = (member = participant) => {
  const r = renderWithProviders(
    <MemoryRouter>
      <ParticipantContext.Provider value={{setShowAddMeterPane: vi.fn(), unsaved: {}, setUnsaved: vi.fn()} as any}>
        <AddMeterPaneComponent/>
      </ParticipantContext.Provider>
    </MemoryRouter>,
    {preloadedState: {participant: {...participantInitial, selectedParticipant: member}}})
  const type = async (name: string, value: string) => {
    const field = r.container.querySelector(`ion-input[name="${name}"]`) as any
    field.value = value
    await act(async () => { fireEvent(field, new CustomEvent("ionInput", {detail: {value}})) })
    await act(async () => { fireEvent(field, new CustomEvent("ionChange", {detail: {value}})) })
  }
  return {...r, type}
}

const fill = async (type: (name: string, value: string) => Promise<void>) => {
  await type("meteringPoint", "AT0030000000000000000000000000001")
  await type("street", "Hauptstraße")
  await type("streetNumber", "5")
  await type("zip", "4020")
  await type("city", "Linz")
}
const register = () => act(async () => fireEvent.submit(document.getElementById("submit-register-meter")!))
const sentMeter = () => registerMeteringpoint.mock.lastCall![0].meter

describe("adding a metering point: the requested day (platform#272)", () => {
  beforeEach(() => {
    registerMeteringpoint.mockReset()
    registerMeteringpoint.mockImplementation(() => () => ({unwrap: () => Promise.resolve()}))
    Api.eegService = new EegService({} as AuthService)
    vi.spyOn(Api.eegService, "fetchRegistrationWindow").mockResolvedValue({from: tomorrow(), to: moment().add(40, "days").toDate()})
  })
  afterEach(() => vi.restoreAllMocks())

  it("online: a note when „Mitglied seit“ is later than „Aktiv ab“; saving is not blocked", async () => {
    online.value = true
    const since = moment().add(20, "days")
    const {type} = setup({...participant, participantSince: since.format("YYYY-MM-DD")})
    expect(screen.getByText(`„Mitglied seit“ (${since.format("DD.MM.YYYY")}) liegt nach „Aktiv ab“ `
      + `(${moment(tomorrow()).format("DD.MM.YYYY")}), es gilt „Mitglied seit“.`)).toBeTruthy()
    await fill(type)
    await register()
    expect(sentMeter().registeredSince).toBe(tomorrowDay())
  })

  it("no note when „Mitglied seit“ is earlier", () => {
    online.value = true
    setup({...participant, participantSince: "2024-01-01"})
    expect(screen.queryByText(/es gilt „Mitglied seit“/)).toBeNull()
  })

  it("online: „Aktiv ab“ is the requested day, tomorrow without a choice, and goes out as registeredSince", async () => {
    online.value = true
    const {type, container} = setup()
    const field = container.querySelector("ion-input[name='registeredSince']") as HTMLIonInputElement
    expect(field.getAttribute("label")).toBe("Aktiv ab (noch nicht beantragt)")
    await fill(type)
    await register()
    expect(sentMeter().registeredSince).toBe(tomorrowDay())
  })

  it("online: a chosen day goes out as that day", async () => {
    const inTenDays = moment().add(10, "days")
    online.value = true
    const {type, container} = setup()
    await fill(type)
    const field = container.querySelector("ion-input[name='registeredSince']") as any
    await act(async () => {
      field.value = inTenDays.format("DD.MM.YYYY")
      fireEvent(field, new CustomEvent("ionInput", {detail: {value: field.value}}))
    })
    await act(async () => { fireEvent.focusOut(field) })
    await register()
    expect(sentMeter().registeredSince).toBe(inTenDays.format("YYYY-MM-DD"))
  })

  it("offline: „Aktiv ab“ stays the activation date", async () => {
    online.value = false
    const {container} = setup()
    expect(container.querySelector("ion-input[name='registeredSince']")).toBeNull()
    expect(container.querySelector("ion-input[name='participantState.activeSince']")).not.toBeNull()
  })
})
