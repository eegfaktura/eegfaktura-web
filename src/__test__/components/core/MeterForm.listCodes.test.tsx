import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter} from "react-router";
import {renderWithProviders} from "../../test-utils";
import {Metering} from "../../../models/meteringpoint.model";
import {EegParticipant} from "../../../models/members.model";
import {fetchParticipantModel, selectMetering, selectParticipant} from "../../../store/participant";
import {Api} from "../../../service";
import {EegService} from "../../../service/eeg.service";
import {AuthService} from "../../../service/auth.service";
import "../../../util/I18n";

vi.mock("../../../store/hook/Eeg.provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../store/hook/Eeg.provider")>()),
  useTenant: () => ({tenant: "RC100100"}),
  useOnlineState: () => true,
}))
vi.mock("../../../components/core/forms/MeterAddressForm/MeterAddressForm.element", () => ({default: () => <div/>}))

import MeterFormComponent from "../../../components/core/MeterForm.component";

// platform#229 addendum: TechCode and FuelCode stay visible after a save of the metering point. The backend ignores
// them and returns the metering point it got, which goes into the store.
const meter = {meteringPoint: "AT0030000000000000000000000000001", direction: "CONSUMPTION", status: "ACTIVE",
  processState: "ACTIVE", partFact: 100, equipmentName: "PV", techCode: "PV01", fuelCode: "E01"} as unknown as Metering
const participant = {id: "p1", firstname: "Anna", lastname: "Muster", meters: [meter]} as unknown as EegParticipant

const fetchMock = vi.fn()

describe("metering point details: codes of the metering point list after a save", () => {
  const eegService = Api.eegService
  beforeEach(() => {
    // the backend answers with the metering point it got
    fetchMock.mockReset().mockImplementation(async (_url: string, init: RequestInit) =>
      ({ok: true, status: 200, json: async () => JSON.parse(init.body as string)} as unknown as Response))
    vi.stubGlobal("fetch", fetchMock)
    const service = new EegService({} as AuthService)
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token")
    Api.eegService = service
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    Api.eegService = eegService
  })

  it("keeps TechCode and FuelCode shown", async () => {
    const r = renderWithProviders(<MemoryRouter><MeterFormComponent meteringPoint={meter}/></MemoryRouter>)
    act(() => {
      r.store.dispatch(fetchParticipantModel.fulfilled({participants: [participant]}, "req", {tenant: "RC100100"}))
      r.store.dispatch(selectParticipant("p1"))
      r.store.dispatch(selectMetering(meter.meteringPoint))
    })
    expect(screen.getByText("PV01")).toBeTruthy()

    const field = r.container.querySelector('ion-input[name="equipmentName"]') as any
    field.value = "Wärmepumpe"
    await act(async () => { fireEvent(field, new CustomEvent("ionInput", {detail: {value: "Wärmepumpe"}})) })
    await act(async () => { fireEvent(field, new CustomEvent("ionChange", {detail: {value: "Wärmepumpe"}})) })
    await act(async () => { await new Promise(res => setTimeout(res, 0)) })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/meteringpoint\/p1\/update\//)
    expect(screen.getByText("PV01")).toBeTruthy()
    expect(screen.getByText("E01")).toBeTruthy()
  })
})
