import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import "../../../util/I18n";

// platform#272: the note „es gilt „Mitglied seit““ in „zulassen“ follows the selection and shows for online
// communities only (offline communities register nothing).
vi.mock("@ionic/react", async (importOriginal) => {
  const ionic = await importOriginal<typeof import("@ionic/react")>()
  const R = await import("react")
  // IonModal does not open in jsdom: a stand-in that opens on mount and dismisses through its ref, as the real one does
  const IonModal = R.forwardRef((props: any, ref) => {
    R.useImperativeHandle(ref, () => ({
      dismiss: async (data?: unknown, role?: string) => props.onWillDismiss?.(new CustomEvent("ionModalWillDismiss", {detail: {data, role}}))
    }) as any)
    R.useEffect(() => { props.onWillPresent?.(new CustomEvent("ionModalWillPresent")) }, [])
    return R.createElement("div", null, props.children)
  })
  return {...ionic, IonModal}
})
const online = vi.hoisted(() => ({value: true}))
vi.mock("../../../store/hook/Eeg.provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../store/hook/Eeg.provider")>()),
  useOnlineState: () => online.value,
}))
import AllowParticipantDialog from "../../../components/dialogs/AllowParticipant.dialog";

const participant = {id: "p1", firstname: "Anna", lastname: "Muster", participantSince: "2026-12-15"} as unknown as EegParticipant
const meters = [{meteringPoint: "AT1", registeredSince: "2026-12-01"}, {meteringPoint: "AT2", registeredSince: "2027-01-08"}] as Metering[]
const NOTE = "AT1: „Mitglied seit“ (15.12.2026) liegt nach „Aktiv ab“ (01.12.2026), es gilt „Mitglied seit“."

describe("„zulassen“: the note „es gilt „Mitglied seit““ (today 28.11.2026)", () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ["Date"]})
    vi.setSystemTime(new Date(2026, 10, 28, 12, 0))
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })
  const setup = (onDismiss = vi.fn()) =>
    render(<AllowParticipantDialog trigger="t" participant={participant} meters={meters} onDismiss={onDismiss}/>)
  const tick = async (box: HTMLIonCheckboxElement, checked: boolean) => {
    box.checked = checked
    await act(async () => { fireEvent(box, new CustomEvent("ionChange", {detail: {checked}})) })
  }
  const sent = (onDismiss: ReturnType<typeof vi.fn>) =>
    (onDismiss.mock.calls[0][1] as Metering[]).map(m => [m.meteringPoint, m.enabled])

  it("an unticked metering point reaches „Zulassen“ with enabled false (W-1)", async () => {
    online.value = true
    const onDismiss = vi.fn()
    const {container} = setup(onDismiss)
    await tick(container.querySelectorAll("ion-checkbox")[0] as HTMLIonCheckboxElement, false)
    await act(async () => { fireEvent.click(screen.getByText("Zulassen")) })
    expect(onDismiss.mock.calls[0][2].detail.role).toBe("confirm")
    expect(sent(onDismiss)).toEqual([["AT1", false], ["AT2", true]])
  })

  it("ticked again, it reaches „Zulassen“ with enabled true", async () => {
    online.value = true
    const onDismiss = vi.fn()
    const {container} = setup(onDismiss)
    const box = container.querySelectorAll("ion-checkbox")[0] as HTMLIonCheckboxElement
    await tick(box, false)
    await tick(box, true)
    await act(async () => { fireEvent.click(screen.getByText("Zulassen")) })
    expect(sent(onDismiss)).toEqual([["AT1", true], ["AT2", true]])
  })

  it("goes away when the metering point is unticked and comes back when ticked again", async () => {
    online.value = true
    const {container} = setup()
    expect(screen.getByText(NOTE)).toBeTruthy()
    const box = container.querySelectorAll("ion-checkbox")[0] as HTMLIonCheckboxElement
    box.checked = false
    await act(async () => { fireEvent(box, new CustomEvent("ionChange", {detail: {checked: false}})) })
    expect(screen.queryByText(NOTE)).toBeNull()
    box.checked = true
    await act(async () => { fireEvent(box, new CustomEvent("ionChange", {detail: {checked: true}})) })
    expect(screen.getByText(NOTE)).toBeTruthy()
  })

  it("is not shown for an offline community", () => {
    online.value = false
    setup()
    expect(screen.queryByText(NOTE)).toBeNull()
  })
})
