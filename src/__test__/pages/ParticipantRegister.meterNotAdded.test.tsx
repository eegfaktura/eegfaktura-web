import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter, RouteComponentProps} from "react-router";
import {useFormContext} from "react-hook-form";
import {renderWithProviders} from "../test-utils";
import {Metering} from "../../models/meteringpoint.model";
import "../../util/I18n";

const toast = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonToast: () => [toast],
}))
vi.mock("../../store/hook/Eeg.provider", () => ({
  useTenant: () => ({tenant: "RC100100"}), useOnlineState: () => true, useEegArea: () => "LOCAL"}))
const createParticipant = vi.hoisted(() => vi.fn())
vi.mock("../../store/participant", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../store/participant")>()),
  createParticipant,
}))
// the member fields are not part of this test
vi.mock("../../components/ParticipantRegisterCommonPane.component", () => ({default: () => <div/>}))
// one button enters a metering point like typing would
vi.mock("../../components/core/MeterForm.element", () => ({
  default: () => {
    const {setValue} = useFormContext<Metering>()
    return <button type="button" onClick={() => setValue("meteringPoint", "AT0030000000000000000000000000001", {shouldDirty: true})}>eingeben</button>
  }
}))
vi.mock("../../components/core/forms/MeterAddressForm/MeterAddressForm.element", () => ({default: () => <div/>}))

import ParticipantRegisterPage, {METER_NOT_ADDED_MESSAGE, NO_METER_MESSAGE} from "../../pages/ParticipantRegister.page";

const history = {replace: vi.fn()}
const setup = () => renderWithProviders(
  <MemoryRouter><ParticipantRegisterPage {...({history} as unknown as RouteComponentProps)}/></MemoryRouter>)
const register = () => act(async () => fireEvent.submit(document.getElementById("submit-register-participant")!))
const sentMeters = () => createParticipant.mock.lastCall![0].participant.meters.map((m: Metering) => m.meteringPoint)

// platform#278: „Registrieren“ with input in the metering point form that was not added, or without a metering point
describe("register page: metering point form not added (platform#278)", () => {
  beforeEach(() => {
    toast.mockReset()
    createParticipant.mockReset()
    createParticipant.mockImplementation(() => () => ({unwrap: () => Promise.resolve()}))
    history.replace.mockReset()
  })
  afterEach(() => cleanup())

  it("input not added: no registration, a hint instead", async () => {
    setup()
    fireEvent.click(screen.getByText("Zählpunkt hinzufügen"))
    fireEvent.click(screen.getByText("eingeben"))
    await register()
    expect(createParticipant).not.toHaveBeenCalled()
    expect(toast.mock.lastCall![0]).toMatchObject({message: METER_NOT_ADDED_MESSAGE, color: "warning"})
  })

  it("added with „Hinzufügen“: registers the member with the metering point", async () => {
    setup()
    fireEvent.click(screen.getByText("Zählpunkt hinzufügen"))
    fireEvent.click(screen.getByText("eingeben"))
    await act(async () => fireEvent.click(screen.getByText("Hinzufügen")))
    await register()
    expect(sentMeters()).toEqual(["AT0030000000000000000000000000001"])
    expect(toast).not.toHaveBeenCalled()
  })

  it("no metering point and no form: no registration, a hint instead", async () => {
    setup()
    await register()
    expect(createParticipant).not.toHaveBeenCalled()
    expect(toast.mock.lastCall![0]).toMatchObject({message: NO_METER_MESSAGE, color: "warning"})
  })

  it("an opened, untouched form adds no metering point: no registration, the same hint", async () => {
    setup()
    fireEvent.click(screen.getByText("Zählpunkt hinzufügen"))
    await register()
    expect(createParticipant).not.toHaveBeenCalled()
    expect(toast.mock.lastCall![0]).toMatchObject({message: NO_METER_MESSAGE, color: "warning"})
  })
})
