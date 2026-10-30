import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React, {useState} from "react";
import {MemoryRouter, useHistory} from "react-router";
import {useFormContext} from "react-hook-form";
import {renderWithProviders} from "../../test-utils";
import {Metering} from "../../../models/meteringpoint.model";
import "../../../util/I18n";
import {Api} from "../../../service";
import {EegService} from "../../../service/eeg.service";
import {AuthService} from "../../../service/auth.service";
import {initialState as participantInitial} from "../../../store/participant/states/participant.state";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))
vi.mock("../../../store/hook/Eeg.provider", () => ({
  useTenant: () => ({tenant: "RC100100"}),
  useOnlineState: () => true,
}))
// the meter fields are not part of this test: one button enters a metering point like typing would
vi.mock("../../../components/core/MeterForm.element", () => ({
  default: () => {
    const {setValue} = useFormContext<Metering>()
    return <button onClick={() => setValue("meteringPoint", "AT0030000000000000000000000000001", {shouldDirty: true})}>eingeben</button>
  }
}))
vi.mock("../../../components/core/forms/MeterAddressForm/MeterAddressForm.element", () => ({default: () => <div/>}))

import AddMeterPaneComponent from "../../../components/participantPane/AddMeterPane.component";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import {UNSAVED_CHANGES_MESSAGE, UNSAVED_DISCARD_MESSAGE} from "../../../components/core/UnsavedChangesGuard.component";

const setup = () => {
  const setShowAddMeterPane = vi.fn()
  const dirtyReports: boolean[] = []
  const userConfirmation = vi.fn((_message: string, callback: (ok: boolean) => void) => callback(false))
  let history: ReturnType<typeof useHistory> | undefined
  const Capture = () => { history = useHistory(); return null }
  const Context = ({children}: { children: React.ReactNode }) => {
    const [unsaved, setUnsavedState] = useState({})
    const setUnsaved = (source: string, d: boolean) => { if (source === "addMeter") dirtyReports.push(d); setUnsavedState(u => ({...u, [source]: d})) }
    return <ParticipantContext.Provider value={{setShowAddMeterPane, unsaved, setUnsaved} as any}>
      {children}
    </ParticipantContext.Provider>
  }
  const r = renderWithProviders(
    <MemoryRouter initialEntries={["/page/participants"]} getUserConfirmation={userConfirmation}>
      <Context><AddMeterPaneComponent/></Context>
      <Capture/>
    </MemoryRouter>)
  return {...r, setShowAddMeterPane, dirtyReports, userConfirmation, history: () => history!}
}
const answer = (role: "confirm" | "cancel") => act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role}}))

describe("adding a metering point: unsaved input asks before it is lost (platform#228 step 4)", () => {
  beforeEach(() => alert.mockReset())

  it("„Zurück“ closes an untouched pane directly", () => {
    const {setShowAddMeterPane} = setup()
    fireEvent.click(screen.getByText("Zurück"))
    expect(alert).not.toHaveBeenCalled()
    expect(setShowAddMeterPane).toHaveBeenCalledWith(false)
  })

  it("„Zurück“ with input asks and closes only on confirm", () => {
    const {setShowAddMeterPane} = setup()
    fireEvent.click(screen.getByText("eingeben"))
    fireEvent.click(screen.getByText("Zurück"))
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    answer("cancel")
    expect(setShowAddMeterPane).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText("Zurück"))
    answer("confirm")
    expect(setShowAddMeterPane).toHaveBeenCalledWith(false)
  })

  it("tells the member list about the input, so selecting another member asks", () => {
    const {dirtyReports, unmount} = setup()
    fireEvent.click(screen.getByText("eingeben"))
    expect(dirtyReports.at(-1)).toBe(true)
    unmount()
    expect(dirtyReports.at(-1)).toBe(false)
  })

  it("leaving the page (menu, browser back) with input asks", () => {
    const {userConfirmation, history} = setup()
    fireEvent.click(screen.getByText("eingeben"))
    act(() => history().push("/page/rates"))
    expect(userConfirmation).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE, expect.any(Function))
    expect(history().location.pathname).toBe("/page/participants")
  })
})

describe("adding a metering point registers it online (decision 2026-10-30)", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("„Registrieren“ sends /create with activationMode ONLINE and no activationCode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({})} as unknown as Response)
    vi.stubGlobal("fetch", fetchMock)
    Api.eegService = new EegService({} as AuthService)
    vi.spyOn(Api.eegService as any, "lookupToken").mockResolvedValue("token")
    renderWithProviders(
      <MemoryRouter>
        <ParticipantContext.Provider value={{setShowAddMeterPane: vi.fn(), unsaved: {}, setUnsaved: vi.fn()} as any}>
          <AddMeterPaneComponent/>
        </ParticipantContext.Provider>
      </MemoryRouter>,
      {preloadedState: {participant: {...participantInitial, selectedParticipant: {id: "p1", meters: []}}}})

    fireEvent.click(screen.getByText("eingeben"))
    await act(async () => { fireEvent.submit(document.getElementById("submit-register-meter")!) })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/meteringpoint\/p1\/create$/)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.meteringPoint).toBe("AT0030000000000000000000000000001")
    expect(body.activationMode).toBe("ONLINE")
    expect(body).not.toHaveProperty("activationCode")
  })
})
