import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import {EegService} from "../../service/eeg.service";
import {ParticipantService} from "../../service/participant.service";
import {AuthService} from "../../service/auth.service";
import {Metering} from "../../models/meteringpoint.model";
import {EdaProcess, Eeg} from "../../models/eeg.model";
import {EegParticipant} from "../../models/members.model";
import {metersToConfirm} from "../../components/dialogs/AllowParticipant.dialog";
import MeteringPointConfirmElement from "../../components/core/elements/MeteringPointConfirm.element";
import ProcessRegisterMeterComponent from "../../components/processDetails/ProcessRegisterMeter.component";
import "../../util/I18n";
import AllowParticipantDialog from "../../components/dialogs/AllowParticipant.dialog";

// IonModal does not open in jsdom: a stand-in that opens on mount and dismisses through its ref, as the real one does
vi.mock("@ionic/react", async (importOriginal) => {
  const ionic = await importOriginal<typeof import("@ionic/react")>()
  const R = await import("react")
  const IonModal = R.forwardRef((props: any, ref) => {
    R.useImperativeHandle(ref, () => ({
      dismiss: async (data?: unknown, role?: string) => props.onWillDismiss?.(new CustomEvent("ionModalWillDismiss", {detail: {data, role}}))
    }) as any)
    R.useEffect(() => { props.onWillPresent?.(new CustomEvent("ionModalWillPresent")) }, [])
    return R.createElement("div", null, props.children)
  })
  return {...ionic, IonModal}
})

// Decision 2026-10-30: the GUI registers metering points online only — no „Offline-Registrierung“, no
// „Aktivierungs-Code“. The backend takes "ONLINE" explicitly (an empty mode fails at /register and would be
// taken as OFFLINE by /confirm), so every request names it.

const fetchMock = vi.fn();
const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body)
const ok = (body: unknown) => ({ok: true, status: 200, json: async () => body} as unknown as Response)

const meter = (meteringPoint: string, extra: Partial<Metering> = {}) =>
  ({meteringPoint, direction: "CONSUMPTION", processState: "NEW", ...extra} as Metering)

describe("registration sends ONLINE without an activation code", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(ok({}))
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("process „Zählpunkt aktivieren“ sends activationMode ONLINE and no activationCode", async () => {
    const service = new EegService({} as AuthService);
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token");
    await service.registerMeteringPoint("RC1", "p1", "AT1", "CONSUMPTION")

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/meteringpoint\/p1\/register$/)
    expect(sentBody()).toEqual({meteringPoint: "AT1", direction: "CONSUMPTION", activationMode: "ONLINE"})
  })

  it("„zulassen“ sends every selected metering point with activationMode ONLINE and an empty activationCode", async () => {
    const service = new ParticipantService({} as AuthService);
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token");
    const meters = metersToConfirm([meter("AT1"), meter("AT2", {activationMode: "OFFLINE", activationCode: "ABC123"} as Partial<Metering>)])  // old data: code not in the model
    await service.confirmParticipant("RC1", "p1", meters)

    const body = sentBody() as Metering[]
    expect(body.map(m => m.meteringPoint)).toEqual(["AT1", "AT2"])
    body.forEach(m => {
      expect(m.activationMode).toBe("ONLINE")
      expect(m.enabled).toBe(true)
      expect(m).toHaveProperty("activationCode", "")  // a code stored with an earlier offline registration is not sent
    })
  })
})

describe("no offline option in the GUI", () => {
  it("„zulassen“: a metering point offers only its selection, no online/offline switch and no activation code", async () => {
    const m = metersToConfirm([meter("AT1")])[0]
    const {container} = render(<MeteringPointConfirmElement m={m}/>)

    expect(screen.getByText("AT1")).toBeInTheDocument()
    expect(container.querySelector("label.switch")).toBeNull()
    expect(container.querySelector('input[type="checkbox"]')).toBeNull()
    expect(screen.queryByText(/Aktivierungs-Code/)).not.toBeInTheDocument()

    // deselecting still leaves the metering point out of the approval
    const box = container.querySelector("ion-checkbox")! as HTMLIonCheckboxElement
    box.checked = false  // the handler reads the element's state
    await act(async () => { fireEvent(box, new CustomEvent("ionChange", {detail: {checked: false}})) })
    expect(m.enabled).toBe(false)
  })

  it("process „Zählpunkt aktivieren“ offers neither „Offline-Registrierung“ nor „Aktivierungs-Code“", () => {
    const participant = {id: "p1", firstname: "Max", lastname: "Muster", participantNumber: "1", meters: [meter("AT1")]} as unknown as EegParticipant
    render(<ProcessRegisterMeterComponent eeg={{id: "rc1", communityId: "AT00100000RC1"} as Eeg} meters={participant.meters}
                                          participants={[participant]}
                                          edaProcess={{name: "Zählpunkt aktivieren", type: "EC_REQ_ONL"} as EdaProcess}/>)

    expect(screen.getByText("Zählpunkt aktivieren")).toBeInTheDocument()
    expect(screen.queryByText(/Offline-Registrierung/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Aktivierungs-Code/)).not.toBeInTheDocument()
  })
})

describe("„zulassen“ keeps the admin's selection (261030-mm3)", () => {
  it("a metering point unticked stays unticked when the member pane re-renders and is not sent", async () => {
    const participant = {id: "p1", firstname: "Max", lastname: "Muster"} as EegParticipant
    const onDismiss = vi.fn()
    const {container, rerender} = render(<AllowParticipantDialog trigger="t" participant={participant}
                                                                 meters={[meter("AT1"), meter("AT2")]} onDismiss={onDismiss}/>)
    const box = () => container.querySelectorAll("ion-checkbox")[1] as HTMLIonCheckboxElement
    expect(box().checked).toBe(true)
    box().checked = false
    await act(async () => { fireEvent(box(), new CustomEvent("ionChange", {detail: {checked: false}})) })

    // the pane hands over the member's meters again, as new objects (any store update or re-render)
    rerender(<AllowParticipantDialog trigger="t" participant={participant}
                                     meters={[meter("AT1"), meter("AT2")]} onDismiss={onDismiss}/>)
    expect(box().checked).toBe(false)

    await act(async () => { fireEvent.click(screen.getByText("Zulassen")) })
    const sent = (onDismiss.mock.calls[0][1] as Metering[]).filter(m => m.enabled)  // the pane sends the enabled ones
    expect(sent.map(m => m.meteringPoint)).toEqual(["AT1"])
  })
})
