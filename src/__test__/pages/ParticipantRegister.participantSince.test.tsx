import {afterEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter, RouteComponentProps} from "react-router";
import {useFormContext} from "react-hook-form";
import {renderWithProviders} from "../test-utils";
import {Metering} from "../../models/meteringpoint.model";
import "../../util/I18n";

// web 261128-mm5: „Mitglied seit“ defaults to today. As a Date it went out as UTC, which is the day before between
// 00:00 and 01:00 (02:00 in summer), and the backend kept that day.
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonToast: () => [vi.fn()],
}))
vi.mock("../../store/hook/Eeg.provider", () => ({
  useTenant: () => ({tenant: "RC100100"}), useOnlineState: () => false, useEegArea: () => "LOCAL"}))
const createParticipant = vi.hoisted(() => vi.fn())
vi.mock("../../store/participant", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../store/participant")>()),
  createParticipant,
}))
vi.mock("../../components/ParticipantRegisterCommonPane.component", () => ({default: () => <div/>}))
vi.mock("../../components/core/MeterForm.element", () => ({
  default: () => {
    const {setValue} = useFormContext<Metering>()
    return <button type="button" onClick={() => setValue("meteringPoint", "AT0030000000000000000000000000001", {shouldDirty: true})}>eingeben</button>
  }
}))
vi.mock("../../components/core/forms/MeterAddressForm/MeterAddressForm.element", () => ({default: () => <div/>}))

import ParticipantRegisterPage from "../../pages/ParticipantRegister.page";

describe("register page: „Mitglied seit“ defaults to the local day (web 261128-mm5)", () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("at 00:30 on 28.11.2026 it goes out as 2026-11-28", async () => {
    vi.useFakeTimers({toFake: ["Date"]})
    vi.setSystemTime(new Date(2026, 10, 28, 0, 30))
    createParticipant.mockImplementation(() => () => ({unwrap: () => Promise.resolve()}))
    renderWithProviders(<MemoryRouter>
      <ParticipantRegisterPage {...({history: {replace: vi.fn()}} as unknown as RouteComponentProps)}/></MemoryRouter>)
    fireEvent.click(screen.getByText("Zählpunkt hinzufügen"))
    fireEvent.click(screen.getByText("eingeben"))
    await act(async () => fireEvent.click(screen.getByText("Hinzufügen")))
    await act(async () => fireEvent.submit(document.getElementById("submit-register-participant")!))
    const sent = createParticipant.mock.lastCall![0].participant
    expect(JSON.stringify(sent.participantSince)).toBe('"2026-11-28"')
  })
})
