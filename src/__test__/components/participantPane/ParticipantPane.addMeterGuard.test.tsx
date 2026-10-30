import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {renderWithProviders} from "../../test-utils";
import {EegParticipant} from "../../../models/members.model";
import {fetchParticipantModel, selectedParticipantSelector} from "../../../store/participant";
import "../../../util/I18n";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))
vi.mock("../../../store/hook/Eeg.provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../store/hook/Eeg.provider")>()),
  useTenant: () => ({tenant: "RC100100", ecId: "AT00999900000RC100100000000000000", rcNr: "RC100100"}),
  useRefresh: () => ({refresh: vi.fn()}),
}))
// jsdom has no layout: the virtual list renders every row
vi.mock("react-virtuoso", () => ({
  Virtuoso: ({totalCount, itemContent, context}: any) =>
    <div>{Array.from({length: totalCount}, (_, i) => <div key={i}>{itemContent(i, undefined, context)}</div>)}</div>,
}))

import ParticipantPaneComponent from "../../../components/participantPane/ParticipantPane.component";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import MemberViewProvider from "../../../store/hook/MemberViewProvider";
import {UNSAVED_DISCARD_MESSAGE} from "../../../components/core/UnsavedChangesGuard.component";

const member = (id: string, lastname: string) => ({
  id, firstname: "Anna", lastname, businessRole: "EEG_PRIVATE", status: "ACTIVE", participantNumber: id,
  meters: [{meteringPoint: "AT00300000000000000000000000" + id, direction: "CONSUMPTION", status: "ACTIVE", processState: "ACTIVE"}],
} as unknown as EegParticipant)
const members = [member("001", "Erste"), member("002", "Zweite")]

const setup = (addMeterDirty: boolean, detailsUnsaved = false) => {
  const setShowAddMeterPane = vi.fn()
  const r = renderWithProviders(
    <ParticipantContext.Provider value={{
      participants: members, allParticipants: members, showAddMeterPane: true, billingEnabled: true, setShowAddMeterPane,
      unsaved: {addMeter: addMeterDirty, details: detailsUnsaved}, setUnsaved: vi.fn(), setBillingEnabled: vi.fn(), showDetailsPage: vi.fn(), reloadEnergyReport: vi.fn(),
    } as any}>
      <MemberViewProvider><ParticipantPaneComponent/></MemberViewProvider>
    </ParticipantContext.Provider>)
  act(() => { r.store.dispatch(fetchParticipantModel.fulfilled({participants: members}, "req", {tenant: "RC100100"})) })
  const selected = () => selectedParticipantSelector(r.store.getState())?.id
  return {...r, setShowAddMeterPane, selected}
}

describe("member list: another member replaces unsaved input of a new metering point only after asking (platform#228 step 4)", () => {
  beforeEach(() => alert.mockReset())

  it("asks first and switches only on confirm", () => {
    const {selected, setShowAddMeterPane} = setup(true)
    fireEvent.click(screen.getByText(/Zweite/))
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    expect(selected()).not.toBe("002")
    expect(setShowAddMeterPane).not.toHaveBeenCalled()
    act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role: "confirm"}}))
    expect(selected()).toBe("002")
    expect(setShowAddMeterPane).toHaveBeenCalledWith(false)
  })

  it("switches directly while the pane holds no input", () => {
    const {selected} = setup(false)
    fireEvent.click(screen.getByText(/Zweite/))
    expect(alert).not.toHaveBeenCalled()
    expect(selected()).toBe("002")
  })

  it("switching to the billing view asks first; declined, the view stays (and its own question is not shown)", () => {
    const {container} = setup(true)
    fireEvent.click(container.querySelector(".eeg-sliding-box input")!)
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role: "cancel"}}))
    expect(alert).toHaveBeenCalledTimes(1)
  })

  it("switching to the billing view goes on to its own question on confirm", () => {
    const {container} = setup(true)
    fireEvent.click(container.querySelector(".eeg-sliding-box input")!)
    act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role: "confirm"}}))
    expect(alert.mock.lastCall![0].subHeader).toBe("Abrechnungsmodus")
  })

  it("another member asks too while the details hold failed or invalid changes (review PR #244)", () => {
    const {selected} = setup(false, true)
    fireEvent.click(screen.getByText(/Zweite/))
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    expect(selected()).not.toBe("002")
  })
})
