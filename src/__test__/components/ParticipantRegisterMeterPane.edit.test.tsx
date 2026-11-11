import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {useFormContext} from "react-hook-form";
import {renderWithReactHookForm} from "../test-utils";
import {Metering} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import "../../util/I18n";

vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [vi.fn()],
}))
vi.mock("../../store/hook/Eeg.provider", () => ({useOnlineState: () => true, useEegArea: () => "LOCAL"}))
vi.mock("../../store", () => ({useAppSelector: () => []}))
// the meter fields are not part of this test: a button enters a metering point number like typing would
vi.mock("../../components/core/MeterForm.element", () => ({
  default: () => {
    const {setValue} = useFormContext<Metering>()
    return <>
      <button onClick={() => setValue("meteringPoint", "AT001", {shouldDirty: true})}>nummer1</button>
      <button onClick={() => setValue("meteringPoint", "AT002", {shouldDirty: true})}>nummer2</button>
    </>
  }
}))
vi.mock("../../components/core/forms/MeterAddressForm/MeterAddressForm.element", () => ({default: () => <div/>}))

import ParticipantRegisterMeterPaneComponent from "../../components/ParticipantRegisterMeterPane.component";

// the metering points the registration would send
const Meters = () => {
  const {watch} = useFormContext<EegParticipant>()
  return <span data-testid="meters">{(watch("meters") ?? []).map(m => m.meteringPoint).join(",")}</span>
}

const setup = () => renderWithReactHookForm(<>
  <ParticipantRegisterMeterPaneComponent participant={{meters: []} as unknown as EegParticipant} onAddMeter={vi.fn()}/>
  <Meters/>
</>, {defaultValues: {meters: []}})

const addMeter = async (number: "nummer1" | "nummer2") => {
  fireEvent.click(screen.getByText("Zählpunkt hinzufügen"))
  fireEvent.click(screen.getByText(number))
  await act(async () => fireEvent.click(screen.getByText("Hinzufügen")))
}
const cards = () => document.querySelectorAll("ion-card")
const meters = () => screen.getByTestId("meters").textContent

describe("registration: correct or remove an added metering point (platform#249)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("a changed number replaces the entry instead of adding a second one", async () => {
    setup()
    await addMeter("nummer1")
    expect(meters()).toBe("AT001")
    fireEvent.click(cards()[0])
    fireEvent.click(screen.getByText("nummer2"))
    await act(async () => fireEvent.click(screen.getByText("Übernehmen")))
    expect(meters()).toBe("AT002")
  })

  it("„Entfernen“ takes the open metering point out of the list", async () => {
    setup()
    await addMeter("nummer1")
    await addMeter("nummer2")
    expect(meters()).toBe("AT001,AT002")
    fireEvent.click(cards()[0])
    fireEvent.click(screen.getByText("Entfernen"))
    expect(meters()).toBe("AT002")
    expect(screen.queryByText("nummer1")).toBeNull()
  })

  it("an entry changed to the number of another one replaces it: one entry per number", async () => {
    setup()
    await addMeter("nummer1")
    await addMeter("nummer2")
    fireEvent.click(cards()[0])
    fireEvent.click(screen.getByText("nummer2"))
    await act(async () => fireEvent.click(screen.getByText("Übernehmen")))
    expect(meters()).toBe("AT002")
  })

  it("„Entfernen“ of a changed form leaves no unsaved input behind", async () => {
    const dirtyReports: boolean[] = []
    renderWithReactHookForm(<>
      <ParticipantRegisterMeterPaneComponent participant={{meters: []} as unknown as EegParticipant} onAddMeter={vi.fn()}
                                             onDirtyChange={d => dirtyReports.push(d)}/>
      <Meters/>
    </>, {defaultValues: {meters: []}})
    await addMeter("nummer1")
    fireEvent.click(cards()[0])
    fireEvent.click(screen.getByText("nummer2"))
    expect(dirtyReports.at(-1)).toBe(true)
    fireEvent.click(screen.getByText("Entfernen"))
    expect(dirtyReports.at(-1)).toBe(false)
    expect(meters()).toBe("")
  })

  it("a new metering point has no „Entfernen“", () => {
    setup()
    fireEvent.click(screen.getByText("Zählpunkt hinzufügen"))
    expect(screen.queryByText("Entfernen")).toBeNull()
    expect(screen.getByText("Hinzufügen")).toBeTruthy()
  })
})
