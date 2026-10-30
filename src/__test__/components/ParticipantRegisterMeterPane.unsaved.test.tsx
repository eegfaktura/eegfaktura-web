import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {useFormContext} from "react-hook-form";
import {renderWithReactHookForm} from "../test-utils";
import {Metering} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import "../../util/I18n";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))
vi.mock("../../store/hook/Eeg.provider", () => ({useOnlineState: () => true, useEegArea: () => "LOCAL"}))
vi.mock("../../store", () => ({useAppSelector: () => []}))
// the meter fields are not part of this test: one button enters a metering point like typing would
vi.mock("../../components/core/MeterForm.element", () => ({
  default: () => {
    const {setValue, watch} = useFormContext<Metering>()
    return <>
      <button onClick={() => setValue("meteringPoint", "AT0030000000000000000000000000001", {shouldDirty: true})}>eingeben</button>
      <span data-testid="meteringPoint">{watch("meteringPoint")}</span>
      <button onClick={() => setValue("equipmentName", "Wärmepumpe", {shouldDirty: true})}>Anlage</button>
      <span data-testid="equipmentName">{watch("equipmentName")}</span>
    </>
  }
}))
vi.mock("../../components/core/forms/MeterAddressForm/MeterAddressForm.element", () => ({default: () => <div/>}))

import ParticipantRegisterMeterPaneComponent from "../../components/ParticipantRegisterMeterPane.component";
import {UNSAVED_DISCARD_MESSAGE} from "../../components/core/UnsavedChangesGuard.component";

const setup = () => {
  const dirtyReports: boolean[] = []
  renderWithReactHookForm(
    <ParticipantRegisterMeterPaneComponent participant={{meters: []} as unknown as EegParticipant} onAddMeter={vi.fn()}
                                           onDirtyChange={d => dirtyReports.push(d)}/>,
    {defaultValues: {meters: []}})
  fireEvent.click(screen.getByText("Zählpunkt hinzufügen"))
  return {dirtyReports}
}
const answer = (role: "confirm" | "cancel") => act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role}}))

describe("registration: the metering point form asks before its input is lost (platform#228 step 4)", () => {
  beforeEach(() => alert.mockReset())

  it("„Abbrechen“ closes an untouched form directly", () => {
    setup()
    fireEvent.click(screen.getByText("Abbrechen"))
    expect(alert).not.toHaveBeenCalled()
    expect(screen.queryByText("eingeben")).toBeNull()
  })

  it("„Abbrechen“ with input asks and closes only on confirm", () => {
    setup()
    fireEvent.click(screen.getByText("eingeben"))
    fireEvent.click(screen.getByText("Abbrechen"))
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    answer("cancel")
    expect(screen.getByTestId("meteringPoint").textContent).toBe("AT0030000000000000000000000000001")
    fireEvent.click(screen.getByText("Abbrechen"))
    answer("confirm")
    expect(screen.queryByText("eingeben")).toBeNull()
  })

  it("„Zählpunkt hinzufügen“ with input asks; confirmed, the form starts empty", () => {
    setup()
    fireEvent.click(screen.getByText("eingeben"))
    fireEvent.click(screen.getByText("Zählpunkt hinzufügen"))
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    answer("confirm")
    expect(screen.getByTestId("meteringPoint").textContent).toBe("")
  })

  it("tells the register page about the input, so leaving the page asks", () => {
    const {dirtyReports} = setup()
    fireEvent.click(screen.getByText("eingeben"))
    expect(dirtyReports.at(-1)).toBe(true)
    fireEvent.click(screen.getByText("Abbrechen"))
    answer("confirm")
    expect(dirtyReports.at(-1)).toBe(false)
  })

  it("the card of the open metering point asks nothing and keeps the input (review PR #244)", async () => {
    const {dirtyReports} = setup()
    fireEvent.click(screen.getByText("eingeben"))
    await act(async () => fireEvent.click(screen.getByText("Hinzufügen")))
    expect(screen.queryByText("Anlage")).toBeNull()
    // the added metering point is listed as a card: open it, change it, click its card again
    const card = () => document.querySelector("ion-card")
    fireEvent.click(card()!)
    fireEvent.click(screen.getByText("Anlage"))
    expect(dirtyReports.at(-1)).toBe(true)
    alert.mockReset()
    fireEvent.click(card()!)
    expect(alert).not.toHaveBeenCalled()
    expect(screen.getByTestId("equipmentName").textContent).toBe("Wärmepumpe")
  })
})
