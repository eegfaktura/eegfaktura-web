import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {renderWithProviders} from "../../test-utils";
import {EegParticipant} from "../../../models/members.model";
import {fetchParticipantModel, selectMetering, selectParticipant} from "../../../store/participant";
import "../../../util/I18n";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))
vi.mock("../../../store/hook/Eeg.provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../store/hook/Eeg.provider")>()),
  useTenant: () => ({tenant: "RC100100"}),
  useAccessGroups: () => ({isAdmin: () => false, isOwner: () => false, isUser: () => true}),
}))
// the forms and lists behind the tabs are not part of this test
vi.mock("../../../components/core/MemberForm.component", () => ({default: () => <div>Mitgliedsformular</div>}))
vi.mock("../../../components/core/MeterForm.component", () => ({default: () => <div>Zählpunktformular</div>}))
vi.mock("../../../components/participantPane/ContractDocument.component", () => ({default: () => <div>Dokumentliste</div>}))
vi.mock("../../../components/participantPane/InvoiceDocument.component", () => ({default: () => <div>Rechnungsliste</div>}))
vi.mock("../../../components/participantPane/MeterChart.component", () => ({default: () => <div/>}))

import ParticipantDetailsPaneComponent from "../../../components/participantPane/ParticipantDetailsPane.component";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import {UNSAVED_DISCARD_MESSAGE} from "../../../components/core/UnsavedChangesGuard.component";

const meter = {meteringPoint: "AT0030000000000000000000000000001", direction: "CONSUMPTION", status: "ACTIVE", processState: "ACTIVE"}
const participant = {id: "p1", firstname: "Anna", lastname: "Muster", businessRole: "EEG_PRIVATE", status: "ACTIVE",
  meters: [meter]} as unknown as EegParticipant

const setup = (detailsUnsaved: boolean) => {
  const r = renderWithProviders(
    <ParticipantContext.Provider value={{unsaved: {details: detailsUnsaved}, setUnsaved: vi.fn()} as any}>
      <ParticipantDetailsPaneComponent/>
    </ParticipantContext.Provider>)
  act(() => {
    r.store.dispatch(fetchParticipantModel.fulfilled({participants: [participant]}, "req", {tenant: "RC100100"}))
    r.store.dispatch(selectParticipant("p1"))
    r.store.dispatch(selectMetering(meter.meteringPoint))
  })
  return r
}

describe("details pane: another tab asks while the form holds failed or invalid changes (re-review PR #244)", () => {
  beforeEach(() => alert.mockReset())

  it("asks first and switches only on confirm", () => {
    setup(true)
    expect(screen.getByText("Zählpunktformular")).toBeTruthy()
    fireEvent.click(screen.getByText("Dokumente"))
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    expect(screen.queryByText("Dokumentliste")).toBeNull()
    act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role: "confirm"}}))
    expect(screen.getByText("Dokumentliste")).toBeTruthy()
  })

  it("switches directly without unsaved changes", () => {
    setup(false)
    fireEvent.click(screen.getByText("Dokumente"))
    expect(alert).not.toHaveBeenCalled()
    expect(screen.getByText("Dokumentliste")).toBeTruthy()
  })
})
