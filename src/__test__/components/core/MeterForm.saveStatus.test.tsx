import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter} from "react-router";
import {useFormContext} from "react-hook-form";
import {renderWithProviders} from "../../test-utils";
import {Metering} from "../../../models/meteringpoint.model";
import {EegParticipant} from "../../../models/members.model";
import {fetchParticipantModel, selectMetering, selectParticipant} from "../../../store/participant";
import {Api} from "../../../service";
import "../../../util/I18n";

vi.mock("../../../store/hook/Eeg.provider", () => ({useTenant: () => ({tenant: "RC100100"}), useOnlineState: () => true}))
// the meter fields are not part of this test: they hand a change to the form as the real fields do
vi.mock("../../../components/core/MeterForm.element", () => ({
  default: ({onChange, onPartChange}: any) => {
    const {setValue, register} = useFormContext<Metering>()
    return <>
      <button onClick={() => onChange([{name: "street", value: "Neugasse"}])}>Straße ändern</button>
      <input data-testid="zip" {...register("zip")}/>
      <button onClick={() => onChange([{name: "equipmentName", value: "Wärmepumpe"}])}>Anlage ändern</button>
      <button onClick={(e) => {
        setValue("partFact", "50" as any, {shouldDirty: true})
        onPartChange("partFact", "50", e)
      }}>Faktor ändern</button>
    </>
  }
}))
vi.mock("../../../components/core/forms/MeterAddressForm/MeterAddressForm.element", () => ({default: () => <div/>}))

import MeterFormComponent from "../../../components/core/MeterForm.component";

// The metering point details save every change on their own; the form shows whether all changes are saved and offers a
// retry after a failed save (platform#228 step 4).

const meter = {meteringPoint: "AT0030000000000000000000000000001", direction: "CONSUMPTION", status: "ACTIVE",
  processState: "ACTIVE", partFact: 100, equipmentName: "", street: "Altgasse", zip: "1010"} as unknown as Metering
const participant = {id: "p1", firstname: "Anna", lastname: "Muster", meters: [meter]} as unknown as EegParticipant

const setup = () => {
  const r = renderWithProviders(<MemoryRouter><MeterFormComponent meteringPoint={meter}/></MemoryRouter>)
  act(() => {
    r.store.dispatch(fetchParticipantModel.fulfilled({participants: [participant]}, "req", {tenant: "RC100100"}))
    r.store.dispatch(selectParticipant("p1"))
    r.store.dispatch(selectMetering(meter.meteringPoint))
  })
  return r
}
const status = () => screen.getByRole("status").textContent

describe("metering point details: save status (platform#228 step 4)", () => {
  beforeEach(() => {
    Api.eegService = {
      updateMeteringPoint: vi.fn().mockImplementation((_t, _p, m) => Promise.resolve(m)),
      updateMeteringPointPartFact: vi.fn().mockResolvedValue({...meter, partFact: 50}),
    } as unknown as typeof Api.eegService
  })

  it("a saved change shows „Alle Änderungen gespeichert“", async () => {
    setup()
    expect(status()).toBe("Alle Änderungen gespeichert")
    await act(async () => fireEvent.click(screen.getByText("Anlage ändern")))
    expect(Api.eegService.updateMeteringPoint).toHaveBeenCalledWith("RC100100", "p1",
      expect.objectContaining({equipmentName: "Wärmepumpe"}))
    expect(status()).toBe("Alle Änderungen gespeichert")
  })

  it("a failed save says so and the retry sends the metering point again", async () => {
    vi.mocked(Api.eegService.updateMeteringPoint).mockRejectedValueOnce(new Error("500"))
    setup()
    await act(async () => fireEvent.click(screen.getByText("Anlage ändern")))
    expect(status()).toBe("Nicht gespeichert – erneut versuchen")
    await act(async () => fireEvent.click(screen.getByText("erneut versuchen")))
    expect(Api.eegService.updateMeteringPoint).toHaveBeenCalledTimes(2)
    expect(vi.mocked(Api.eegService.updateMeteringPoint).mock.lastCall![2]).toEqual(expect.objectContaining({equipmentName: "Wärmepumpe"}))
    expect(status()).toBe("Alle Änderungen gespeichert")
  })

  it("the participation factor shows the same status and is retried with its value", async () => {
    vi.mocked(Api.eegService.updateMeteringPointPartFact).mockRejectedValueOnce(new Error("500"))
    setup()
    await act(async () => fireEvent.click(screen.getByText("Faktor ändern")))
    expect(status()).toBe("Nicht gespeichert – erneut versuchen")
    await act(async () => fireEvent.click(screen.getByText("erneut versuchen")))
    expect(Api.eegService.updateMeteringPointPartFact).toHaveBeenCalledTimes(2)
    expect(Api.eegService.updateMeteringPointPartFact).toHaveBeenLastCalledWith("RC100100", "p1", meter.meteringPoint, 50)
    expect(status()).toBe("Alle Änderungen gespeichert")
  })

  it("input typed while a save runs stays after the save (review PR #244)", async () => {
    let finish: (m: Metering) => void = () => {}
    vi.mocked(Api.eegService.updateMeteringPoint).mockImplementationOnce(() => new Promise<Metering>(res => { finish = res }))
    setup()
    await act(async () => fireEvent.click(screen.getByText("Straße ändern")))
    await act(async () => fireEvent.change(screen.getByTestId("zip"), {target: {value: "9999"}}))
    await act(async () => finish({...meter, street: "Neugasse"} as Metering))
    expect((screen.getByTestId("zip") as HTMLInputElement).value).toBe("9999")
  })
})
