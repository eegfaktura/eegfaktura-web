import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {Controller} from "react-hook-form";
import moment from "moment";

// platform#272: „Zählpunkt aktivieren“ shows the day stored at the metering point as „Aktiv ab“, within the same window
// as the metering point form, and sends it as the start of the registration.
const alert = vi.fn()
const toaster = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
  useIonToast: () => [toaster],
}))
vi.mock("../../../components/form/BasicSelect.component", () => ({
  BasicSelectComponent: ({control, name, rules}: any) =>
    <Controller control={control} name={name} rules={rules} render={({field}) =>
      <input aria-label={name} value={field.value ?? ""} onChange={e => field.onChange(e.target.value)}/>}/>,
}))

import "../../../util/I18n";
import {Api} from "../../../service";
import {EegService} from "../../../service/eeg.service";
import {AuthService} from "../../../service/auth.service";
import {Eeg, EdaProcess} from "../../../models/eeg.model";
import {Metering} from "../../../models/meteringpoint.model";
import {EegParticipant} from "../../../models/members.model";
import ProcessRegisterMeterComponent from "../../../components/processDetails/ProcessRegisterMeter.component";
import {tomorrow} from "../../../components/form/useRegistrationWindow.hook";

const eeg = {id: "te100200", communityId: "AT00999900000TC100200000000000001"} as unknown as Eeg
const mp = "AT0030000000000000000000000000002"
const participant = (registeredSince?: string, processState = "REJECTED") => ({id: "p1", participantNumber: "7",
  firstname: "Anna", lastname: "Muster",
  meters: [{meteringPoint: mp, direction: "CONSUMPTION", processState, registeredSince} as unknown as Metering]
} as unknown as EegParticipant)
const ymd = (m: moment.Moment) => m.format("YYYY-MM-DD")
const inDays = (n: number) => moment().add(n, "days").startOf("day")

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const submitButton = () => screen.getAllByText("Anfordern").find(e => e.tagName === "ION-BUTTON")!
const isDisabled = (e: Element) => e.hasAttribute("disabled") && e.getAttribute("disabled") !== "false"

const setup = async (registeredSince?: string, processState?: string) => {
  const p = participant(registeredSince, processState)
  const r = render(<ProcessRegisterMeterComponent eeg={eeg} meters={p.meters} participants={[p]}
                                                  edaProcess={{name: "Zählpunkt anmelden"} as EdaProcess}/>)
  fireEvent.change(screen.getByLabelText("meteringPoint"), {target: {value: mp}})
  await flush()
  const field = () => r.container.querySelector("ion-input[name='registrationDate']") as HTMLIonInputElement | null
  return {...r, field, p}
}
const send = async () => {
  fireEvent.click(submitButton())
  await flush()
  await act(async () => alert.mock.lastCall![0].onDidDismiss({detail: {role: "confirm"}}))
  await flush()
}

beforeEach(() => {
  alert.mockReset()
  toaster.mockReset()
  Api.eegService = new EegService({} as AuthService)
  vi.spyOn(Api.eegService, "registerMeteringPoint").mockResolvedValue({} as any)
  vi.spyOn(Api.eegService, "fetchRegistrationWindow").mockResolvedValue({from: tomorrow(), to: inDays(30).toDate()})
})
afterEach(() => vi.restoreAllMocks())

describe("Zählpunkt aktivieren: „Aktiv ab“ (platform#272)", () => {
  it("appears only after the metering point is chosen", async () => {
    const p = participant(ymd(inDays(10)))
    const {container} = render(<ProcessRegisterMeterComponent eeg={eeg} meters={p.meters} participants={[p]}
                                                              edaProcess={{name: "Zählpunkt anmelden"} as EdaProcess}/>)
    expect(container.querySelector("ion-input[name='registrationDate']")).toBeNull()
  })

  it("shows the stored day and sends it as from", async () => {
    const {field} = await setup(ymd(inDays(10)))
    expect(field()!.value).toBe(inDays(10).format("DD.MM.YYYY"))
    await send()
    expect(Api.eegService.registerMeteringPoint).toHaveBeenCalledWith("TE100200", "p1", mp, "CONSUMPTION",
      inDays(10).toDate())
  })

  it("a stored day in the past becomes tomorrow", async () => {
    const {field} = await setup(ymd(inDays(-5)))
    expect(field()!.value).toBe(inDays(1).format("DD.MM.YYYY"))
    await send()
    expect(Api.eegService.registerMeteringPoint).toHaveBeenCalledWith("TE100200", "p1", mp, "CONSUMPTION", tomorrow())
  })

  it("a changed day is sent", async () => {
    const {field} = await setup(ymd(inDays(10)))
    const input = field()! as any
    await act(async () => {
      input.value = inDays(20).format("DD.MM.YYYY")
      fireEvent(input, new CustomEvent("ionInput", {detail: {value: input.value}}))
    })
    await act(async () => { fireEvent.focusOut(input) })
    await flush()
    await send()
    expect(Api.eegService.registerMeteringPoint).toHaveBeenCalledWith("TE100200", "p1", mp, "CONSUMPTION",
      inDays(20).toDate())
  })

  it("a day beyond the window is an error and cannot be sent", async () => {
    const {container} = await setup(ymd(inDays(40)))
    expect(container.querySelector(".error-line")?.textContent)
      .toBe(`Höchstens 30 Arbeitstage im Voraus, also bis ${inDays(30).format("DD.MM.YYYY")}.`)
    expect(isDisabled(submitButton())).toBe(true)
  })

  it("a refusal of the backend shows its reason", async () => {
    vi.mocked(Api.eegService.registerMeteringPoint)
      .mockRejectedValue(new Error("Der Termin liegt mehr als 30 Arbeitstage in der Zukunft."))
    await setup(ymd(inDays(10)))
    await send()
    expect(toaster.mock.lastCall![0]).toMatchObject({color: "danger",
      message: "Die Anforderung konnte nicht gesendet werden. (Der Termin liegt mehr als 30 Arbeitstage in der Zukunft.)"})
  })

  it.each(["INIT", "PENDING", "APPROVED"])("%s: the stored day is shown read only and no from is sent", async (state) => {
    const {field} = await setup(ymd(inDays(-3)), state)
    expect(field()!.value).toBe(inDays(-3).format("DD.MM.YYYY"))
    expect(field()!.getAttribute("label")).toBe("Aktiv ab (beantragt)")
    expect(field()!.disabled).toBe(true)
    await send()
    expect(Api.eegService.registerMeteringPoint).toHaveBeenCalledWith("TE100200", "p1", mp, "CONSUMPTION", undefined)
  })

  it("a reload of the members keeps a changed day", async () => {
    const {field, rerender, p} = await setup(ymd(inDays(10)))
    const input = field()! as any
    await act(async () => {
      input.value = inDays(20).format("DD.MM.YYYY")
      fireEvent(input, new CustomEvent("ionInput", {detail: {value: input.value}}))
    })
    await act(async () => { fireEvent.focusOut(input) })
    await flush()
    // the store hands over the members again, as new objects
    const reloaded = {...p, meters: p.meters.map(m => ({...m}))} as EegParticipant
    rerender(<ProcessRegisterMeterComponent eeg={eeg} meters={reloaded.meters} participants={[reloaded]}
                                            edaProcess={{name: "Zählpunkt anmelden"} as EdaProcess}/>)
    await flush()
    expect(field()!.value).toBe(inDays(20).format("DD.MM.YYYY"))
  })
})
