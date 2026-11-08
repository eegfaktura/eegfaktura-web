import {beforeEach, describe, expect, it, vi} from "vitest";
import React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {Controller} from "react-hook-form";

// platform#228 step 3: every EDA process sent from the web asks first with a summary; cancel sends nothing, confirm
// sends what was sent before.
const alert = vi.fn()
const toaster = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
  useIonToast: () => [toaster],
}))
// the form widgets are not part of this test: plain inputs bound to the same form fields
const select = vi.hoisted(() => ({control, name, rules, multiple, options}: any) =>
  <Controller control={control} name={name} rules={rules} render={({field}) =>
    <input aria-label={name} data-options={options?.map((o: any) => o.label).join("|")} value={(multiple ? (field.value ?? []).join(",") : field.value) ?? ""}
           onChange={e => field.onChange(multiple ? e.target.value.split(",") : e.target.value)}/>}/>)
vi.mock("../../../components/form/BasicSelect.component", () => ({BasicSelectComponent: select}))
vi.mock("../../../components/form/SelectForm.component", () => ({default: select}))
vi.mock("../../../components/form/InputForm.component", () => ({
  default: ({control, name, rules, isNumber}: any) =>
    <Controller control={control} name={name} rules={rules} render={({field}) =>
      <input aria-label={name} value={field.value ?? ""}
             onChange={e => field.onChange(isNumber ? Number(e.target.value) : e.target.value)}/>}/>,
}))
vi.mock("../../../components/form/Checkbox.component", () => ({
  default: ({label, checked, setChecked}: any) =>
    <input type="checkbox" aria-label={label} checked={checked} onChange={e => setChecked(e.target.checked)}/>,
}))
vi.mock("react-datepicker", () => ({
  default: ({onChange, selectsRange}: any) => <button onClick={() => onChange(selectsRange
    ? [new Date(2026, 8, 1), new Date(2026, 8, 30)] : new Date(2026, 9, 31))}>Datum</button>,
}))
const inWindow = vi.hoisted(() => ({open: true}))
vi.mock("../../../util/PartFactWindow.util", () => ({isInPartFactWindow: () => inWindow.open, PARTFACT_WINDOW_TEXT: "x"}))
vi.mock("../../../store/hook/Eeg.provider", () => ({useTenant: () => ({tenant: "TE100200"})}))

import "../../../util/I18n";
import {Api} from "../../../service";
import {Eeg, EdaProcess} from "../../../models/eeg.model";
import {Metering} from "../../../models/meteringpoint.model";
import {EegParticipant} from "../../../models/members.model";
import ProcessChangeParticipantFactorComponent from "../../../components/processDetails/ProcessChangeParticipantFactor.component";
import ProcessRegisterMeterComponent from "../../../components/processDetails/ProcessRegisterMeter.component";
import ProcessRequestValuesComponent from "../../../components/processDetails/ProcessRequestValues.component";
import ProcessRevokeMeteringpointComponent from "../../../components/processDetails/ProcessRevokeMeteringpoint.component";
import ProcessPodListComponent from "../../../components/processDetails/ProcessPodList.component";
import {renderWithProviders} from "../../test-utils";
import {fetchParticipantModel} from "../../../store/participant";

const eeg = {id: "te100200", rcNumber: "RC100200", communityId: "AT00999900000TC100200000000000001",
  gridOperator: "AT003000", area: "LEA"} as unknown as Eeg
const process = (name: string) => ({name, description: "", enabled: true} as EdaProcess)
const activeSince = new Date("2026-01-01")
const meter = (meteringPoint: string, extra: Partial<Metering> = {}) => ({meteringPoint, direction: "CONSUMPTION",
  gridOperatorId: "AT003000", processState: "ACTIVE", partFact: 100, consentId: "C-" + meteringPoint,
  participantState: {activeSince}, ...extra} as unknown as Metering)
const m1 = meter("AT0030000000000000000000000000001")
const m2 = meter("AT0030000000000000000000000000002", {processState: "NEW"} as Partial<Metering>)
const participant = {id: "p1", participantNumber: "7", firstname: "Anna", lastname: "Muster",
  meters: [m1, m2]} as unknown as EegParticipant

const type = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), {target: {value}})
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const submit = async (text: string) => {
  fireEvent.click(submitButton(text))
  await flush()
}
const dismiss = (role: string) => act(async () => alert.mock.lastCall![0].onDidDismiss({detail: {role}}))

const submitButton = (text: string) => screen.getAllByText(text).find(e => e.tagName === "ION-BUTTON")!
// ion-button: "true" before Ionic hydrates it, "" after
const isDisabled = (e: Element) => e.hasAttribute("disabled") && e.getAttribute("disabled") !== "false"

beforeEach(() => {
  inWindow.open = true
  alert.mockReset()
  Api.eegService = {
    changeMeterPartitionFactor: vi.fn().mockResolvedValue(undefined),
    registerMeteringPoint: vi.fn().mockResolvedValue({}),
    syncMeteringPoint: vi.fn().mockResolvedValue({skipped: []}),
    revokeMeteringPoint: vi.fn().mockResolvedValue({}),
    syncMeteringPointList: vi.fn().mockResolvedValue(undefined),
  } as unknown as typeof Api.eegService
})

describe("Teilnahmefaktor ändern", () => {
  const fill = async () => {
    render(<ProcessChangeParticipantFactorComponent eeg={eeg} meters={[m1]} participants={[participant]}
                                                    edaProcess={process("Teilnahmefaktor ändern")}/>)
    type("meteringPoints", m1.meteringPoint)
    type("partFact", "40")
    await submit("Anfordern")
  }

  it("asks with meter and old/new factor; cancel sends nothing", async () => {
    await fill()
    expect(alert.mock.lastCall![0].subHeader).toBe("Teilnahmefaktor ändern")
    expect(alert.mock.lastCall![0].message).toBe(
      `Teilnahmefaktor für den Zählpunkt ${m1.meteringPoint} von 100 % auf 40 % ändern? Die Änderung geht an den Netzbetreiber.`)
    await dismiss("cancel")
    expect(Api.eegService.changeMeterPartitionFactor).not.toHaveBeenCalled()
  })

  it("confirm sends the request unchanged", async () => {
    await fill()
    await dismiss("confirm")
    expect(Api.eegService.changeMeterPartitionFactor).toHaveBeenCalledWith("TE100200", [{meter: m1.meteringPoint,
      direction: "CONSUMPTION", gridOperatorId: "AT003000", activation: activeSince, partFact: 40}])
  })
})

describe("Teilnahmefaktor ändern: window closes while the dialog is open", () => {
  it("confirmed after 17:00: sends nothing and shows the warning (the grid operator would answer 82)", async () => {
    render(<ProcessChangeParticipantFactorComponent eeg={eeg} meters={[m1]} participants={[participant]}
                                                    edaProcess={process("Teilnahmefaktor ändern")}/>)
    type("meteringPoints", m1.meteringPoint)
    type("partFact", "40")
    await submit("Anfordern")
    inWindow.open = false
    await dismiss("confirm")
    expect(Api.eegService.changeMeterPartitionFactor).not.toHaveBeenCalled()
    expect(screen.getByText(/Es ist gerade außerhalb dieser Zeit/)).toBeTruthy()
  })
})

describe("Zählpunkt anmelden", () => {
  it("asks with meter and member (online only); cancel sends nothing, confirm sends the request unchanged", async () => {
    render(<ProcessRegisterMeterComponent eeg={eeg} meters={[m1, m2]} participants={[participant]}
                                          edaProcess={process("Zählpunkt anmelden")}/>)
    type("meteringPoint", m2.meteringPoint)
    await submit("Anfordern")
    expect(alert.mock.lastCall![0].message).toBe(`Zählpunkt ${m2.meteringPoint} (7 Muster Anna) online beim Netzbetreiber anmelden?`)
    await dismiss("cancel")
    expect(Api.eegService.registerMeteringPoint).not.toHaveBeenCalled()

    await submit("Anfordern")
    await dismiss("confirm")
    expect(Api.eegService.registerMeteringPoint).toHaveBeenCalledWith("TE100200", "p1", m2.meteringPoint,
      "CONSUMPTION")
  })
})

// bug 08.11.2026: after an owner change the metering point is at two members; the chosen member was replaced by the
// first one holding the number (the old owner, sorted first), in the dialog and in the request
describe("Zählpunkt anmelden nach Besitzerwechsel", () => {
  const moved = "AT0030000000000000000000000000009"
  const oldOwner = {id: "p0", participantNumber: "220", firstname: "Berta", lastname: "Alt",
    meters: [meter(moved, {processState: "INACTIVE", status: "INACTIVE"} as Partial<Metering>)]} as unknown as EegParticipant
  const newOwner = {id: "p9", participantNumber: "337", firstname: "Carl", lastname: "Neu",
    meters: [meter(moved, {processState: "INACTIVE", status: "INIT"} as Partial<Metering>)]} as unknown as EegParticipant

  it("asks and sends for the chosen member, not the old owner", async () => {
    render(<ProcessRegisterMeterComponent eeg={eeg} meters={[...oldOwner.meters, ...newOwner.meters]}
                                          participants={[newOwner, oldOwner]} edaProcess={process("Zählpunkt anmelden")}/>)
    type("participantId", "p9")
    await flush()
    type("meteringPoint", moved)
    await flush()
    await submit("Anfordern")
    expect(alert.mock.lastCall![0].message).toBe(`Zählpunkt ${moved} (337 Neu Carl) online beim Netzbetreiber anmelden?`)
    await dismiss("confirm")
    expect(Api.eegService.registerMeteringPoint).toHaveBeenCalledWith("TE100200", "p9", moved, "CONSUMPTION")
  })

  it("does not pick a member by itself when two hold the metering point, and lists the number once", async () => {
    render(<ProcessRegisterMeterComponent eeg={eeg} meters={[...oldOwner.meters, ...newOwner.meters]}
                                          participants={[newOwner, oldOwner]} edaProcess={process("Zählpunkt anmelden")}/>)
    const labels = screen.getByLabelText("meteringPoint").getAttribute("data-options")!.split("|")
    expect(labels.filter(l => l.includes(moved))).toHaveLength(1)
    type("meteringPoint", moved)
    await flush()
    expect((screen.getByLabelText("participantId") as HTMLInputElement).value).toBe("")
    expect(isDisabled(submitButton("Anfordern"))).toBe(true)
  })

  it("choosing another member after the metering point clears it; nothing goes to the metering point's holder", async () => {
    const other = {id: "p5", participantNumber: "500", firstname: "Dora", lastname: "Dritt",
      meters: [meter("AT0030000000000000000000000000008", {processState: "NEW"} as Partial<Metering>)]} as unknown as EegParticipant
    render(<ProcessRegisterMeterComponent eeg={eeg} meters={[...other.meters, ...newOwner.meters]}
                                          participants={[newOwner, other]} edaProcess={process("Zählpunkt anmelden")}/>)
    type("meteringPoint", other.meters[0].meteringPoint)
    await flush()
    expect((screen.getByLabelText("participantId") as HTMLInputElement).value).toBe("p5")
    type("participantId", "p9")
    await flush()
    expect(isDisabled(submitButton("Anfordern"))).toBe(true)
    type("meteringPoint", moved)
    await flush()
    await submit("Anfordern")
    await dismiss("confirm")
    expect(Api.eegService.registerMeteringPoint).toHaveBeenCalledWith("TE100200", "p9", moved, "CONSUMPTION")
  })
})

describe("Energiedaten anfordern (ohne Smart)", () => {
  it("asks with meters and period; cancel sends nothing, confirm sends the request unchanged", async () => {
    render(<ProcessRequestValuesComponent eeg={eeg} meters={[m1]} participants={[participant]}
                                          edaProcess={process("Energiedaten anfordern")}/>)
    fireEvent.click(screen.getByLabelText("Nur fehlende Daten oder L3-Werte anfordern (Smart)"))
    type("meteringPoints", m1.meteringPoint)
    fireEvent.click(screen.getByText("Datum"))
    await submit("Anfordern")
    expect(alert.mock.lastCall![0].message).toBe(
      `Energiedaten für den Zählpunkt ${m1.meteringPoint} für 01.09.2026 – 30.09.2026 beim Netzbetreiber anfordern?`)
    await dismiss("cancel")
    expect(Api.eegService.syncMeteringPoint).not.toHaveBeenCalled()

    await submit("Anfordern")
    await dismiss("confirm")
    expect(Api.eegService.syncMeteringPoint).toHaveBeenCalledWith("TE100200",
      [{meter: m1.meteringPoint, direction: "CONSUMPTION"}], new Date(2026, 8, 1).getTime(),
      new Date(2026, 8, 30).getTime(), [])
  })
})

describe("Datenfreigabe aufheben", () => {
  it("asks with meter and end date; cancel sends nothing, confirm sends the request unchanged", async () => {
    render(<ProcessRevokeMeteringpointComponent eeg={eeg} meters={[m1]} participants={[participant]}
                                                edaProcess={process("Datenfreigabe aufheben")}/>)
    type("participantId", "p1")
    await flush()
    type("meteringPoints", m1.meteringPoint)
    fireEvent.click(screen.getByText("Datum"))
    await submit("Anfordern")
    expect(alert.mock.lastCall![0].message).toBe(`Soll die Datenfreigabe für den Zählpunkt ${m1.meteringPoint} beim `
      + `Netzbetreiber aufgehoben werden? Ende der Datenfreigabe: 31.10.2026.`)
    // no second revoke from a double click: disabled while the dialog is open
    expect(isDisabled(submitButton("Anfordern"))).toBe(true)
    await dismiss("cancel")
    expect(Api.eegService.revokeMeteringPoint).not.toHaveBeenCalled()

    await submit("Anfordern")
    await dismiss("confirm")
    expect(Api.eegService.revokeMeteringPoint).toHaveBeenCalledWith("TE100200", "p1",
      [{meter: m1.meteringPoint, direction: "CONSUMPTION", consentId: m1.consentId}], new Date(2026, 9, 31).getTime(), undefined)
  })
})

describe("Zählpunktliste anfordern", () => {
  it("asks with the grid operator; cancel sends nothing, confirm sends the request unchanged", async () => {
    renderWithProviders(<ProcessPodListComponent eeg={eeg} edaProcess={process("Zählpunktliste anfordern")}/>)
    await submit("Zählpunktliste anfordern")
    expect(alert.mock.lastCall![0].message).toBe("Zählpunktliste beim Netzbetreiber AT003000 anfordern?")
    // no second request from a double click: disabled while the dialog is open
    expect(isDisabled(submitButton("Zählpunktliste anfordern"))).toBe(true)
    await dismiss("cancel")
    expect(Api.eegService.syncMeteringPointList).not.toHaveBeenCalled()

    await submit("Zählpunktliste anfordern")
    await dismiss("confirm")
    expect(Api.eegService.syncMeteringPointList).toHaveBeenCalledWith("RC100200", "AT003000")
  })

  // platform#229 addendum: P2P and EVA run like a BEG, with metering points at several grid operators
  it.each([["BEG", true], ["P2P", true], ["EVA", true], ["LOCAL", false]])("%s: grid operator chosen per request = %s",
    (area, shown) => {
      renderWithProviders(<ProcessPodListComponent eeg={{...eeg, area} as Eeg} edaProcess={process("Zählpunktliste anfordern")}/>)
      expect(!!screen.queryByLabelText("operatorId")).toBe(shown)
    })

  // eegfaktura-dev#56 #8: without metering points the community's grid operator is a visible, preselected option
  it.each(["BEG", "P2P", "EVA"])("%s without metering points: offers the community's grid operator, preselected", (area) => {
    renderWithProviders(<ProcessPodListComponent eeg={{...eeg, area, operatorName: "Netz Test"} as Eeg}
                                    edaProcess={process("Zählpunktliste anfordern")}/>)
    const operator = screen.getByLabelText("operatorId")
    expect(operator.getAttribute("data-options")).toBe("AT003000 - Netz Test")
    expect((operator as HTMLInputElement).value).toBe("AT003000")
    expect(screen.queryByText(/kein Netzbetreiber hinterlegt/)).toBeNull()
  })

  it.each(["P2P", "LOCAL"])("%s without any grid operator: hint, button disabled, nothing sent", async (area) => {
    renderWithProviders(<ProcessPodListComponent eeg={{...eeg, area, gridOperator: ""} as Eeg}
                                    edaProcess={process("Zählpunktliste anfordern")}/>)
    expect(screen.getByText(/kein Netzbetreiber hinterlegt/)).toBeTruthy()
    expect(screen.queryByLabelText("operatorId")).toBeNull()
    expect(isDisabled(submitButton("Zählpunktliste anfordern"))).toBe(true)
    await submit("Zählpunktliste anfordern")
    expect(alert).not.toHaveBeenCalled()
    expect(Api.eegService.syncMeteringPointList).not.toHaveBeenCalled()
  })

  const withOperator = (gridOperatorId: string) => ({...participant,
    meters: [meter(m1.meteringPoint, {gridOperatorId, gridOperatorName: "Netz Zählpunkt"} as Partial<Metering>)]}) as EegParticipant

  // review 1: the community's operator is normalised like the metering points' one, so it is one option
  it("community operator differing from a meter's only in case and spaces: one option, request with AT003000", async () => {
    const r = renderWithProviders(<ProcessPodListComponent eeg={{...eeg, area: "BEG", gridOperator: " at003000 "} as Eeg}
                                                           edaProcess={process("Zählpunktliste anfordern")}/>)
    act(() => { r.store.dispatch(fetchParticipantModel.fulfilled({participants: [withOperator("AT003000")]}, "req", {tenant: "TE100200"})) })
    const operator = screen.getByLabelText("operatorId") as HTMLInputElement
    expect(operator.getAttribute("data-options")).toBe("AT003000 - Netz Zählpunkt")
    expect(operator.value).toBe("AT003000")
    await submit("Zählpunktliste anfordern")
    await dismiss("confirm")
    expect(Api.eegService.syncMeteringPointList).toHaveBeenCalledWith("RC100200", "AT003000")
  })

  it("a blank community operator counts as none", () => {
    renderWithProviders(<ProcessPodListComponent eeg={{...eeg, gridOperator: "  "} as Eeg}
                                                 edaProcess={process("Zählpunktliste anfordern")}/>)
    expect(screen.getByText(/kein Netzbetreiber hinterlegt/)).toBeTruthy()
    expect(isDisabled(submitButton("Zählpunktliste anfordern"))).toBe(true)
  })

  it("P2P without any grid operator: the hint goes once metering points with an operator are loaded", () => {
    const r = renderWithProviders(<ProcessPodListComponent eeg={{...eeg, area: "P2P", gridOperator: ""} as Eeg}
                                                           edaProcess={process("Zählpunktliste anfordern")}/>)
    expect(screen.getByText(/kein Netzbetreiber hinterlegt/)).toBeTruthy()
    act(() => { r.store.dispatch(fetchParticipantModel.fulfilled({participants: [withOperator("AT004000")]}, "req", {tenant: "TE100200"})) })
    expect(screen.queryByText(/kein Netzbetreiber hinterlegt/)).toBeNull()
    expect(screen.getByLabelText("operatorId").getAttribute("data-options")).toBe("AT004000 - Netz Zählpunkt")
  })
})
