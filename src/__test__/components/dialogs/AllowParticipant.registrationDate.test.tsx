import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {renderWithProviders} from "../../test-utils";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import "../../../util/I18n";

// platform#272: activating a member registers each metering point from its requested day, or from „Mitglied seit“
// when that is later; the dialog says so. A refusal of the backend (e.g. a day beyond the window) shows its reason.
const toaster = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonToast: () => [toaster],
}))
vi.mock("../../../store/hook/Eeg.provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../store/hook/Eeg.provider")>()),
  useTenant: () => ({tenant: "RC100100"}),
  useAccessGroups: () => ({isAdmin: () => true, isOwner: () => false, isUser: () => false}),
}))
vi.mock("../../../components/core/MemberForm.component", () => ({default: () => <div/>}))
vi.mock("../../../components/participantPane/MeterChart.component", () => ({default: () => <div/>}))
// the dialog confirms at once with the meters it got
vi.mock("../../../components/dialogs/AllowParticipant.dialog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../components/dialogs/AllowParticipant.dialog")>()),
  default: ({participant, meters, onDismiss}: any) =>
    <button onClick={() => onDismiss(participant, meters.map((m: Metering) => ({...m, enabled: true})), {detail: {role: "confirm"}})}>
      zulassen</button>,
}))

import {memberSinceLaterNotes} from "../../../components/dialogs/AllowParticipant.dialog";
import ParticipantDetailsPaneComponent from "../../../components/participantPane/ParticipantDetailsPane.component";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import {fetchParticipantModel, selectParticipant} from "../../../store/participant";
import {Api} from "../../../service";

const meter = (meteringPoint: string, registeredSince: string, enabled = true) =>
  ({meteringPoint, registeredSince, enabled} as unknown as Metering)
const member = (participantSince: string, meters: Metering[]) =>
  ({id: "p1", firstname: "Anna", lastname: "Muster", participantSince, meters} as unknown as EegParticipant)

describe("memberSinceLaterNotes", () => {
  it("notes each selected metering point whose day is before „Mitglied seit“", () => {
    const meters = [meter("AT1", "2026-12-01"), meter("AT2", "2027-01-08"), meter("AT3", "2026-12-01", false)]
    expect(memberSinceLaterNotes(member("2027-01-01", meters), meters)).toEqual([
      "AT1: „Mitglied seit“ (01.01.2027) liegt nach „Aktiv ab“ (01.12.2026), es gilt „Mitglied seit“."])
  })

  it("says nothing when the day is the same or later", () => {
    const meters = [meter("AT1", "2027-01-01"), meter("AT2", "2027-01-08")]
    expect(memberSinceLaterNotes(member("2027-01-01", meters), meters)).toEqual([])
  })
})

describe("activating a member: a refusal shows the reason", () => {
  it("the toast carries the backend's text", async () => {
    Api.participantService = {confirmParticipant: vi.fn()
      .mockRejectedValue(new Error("Der Termin von AT1 liegt mehr als 30 Arbeitstage in der Zukunft."))
    } as unknown as typeof Api.participantService
    const p = {...member("2026-12-01", [meter("AT1", "2026-12-01")]), status: "NEW", businessRole: "EEG_PRIVATE"}
    const r = renderWithProviders(
      <ParticipantContext.Provider value={{unsaved: {}, setUnsaved: vi.fn()} as any}>
        <ParticipantDetailsPaneComponent/>
      </ParticipantContext.Provider>)
    act(() => {
      r.store.dispatch(fetchParticipantModel.fulfilled({participants: [p]} as any, "req", {tenant: "RC100100"}))
      r.store.dispatch(selectParticipant("p1"))
    })
    await act(async () => fireEvent.click(screen.getByText("zulassen")))
    await act(async () => { await new Promise(res => setTimeout(res, 0)) })
    expect(toaster.mock.lastCall![0].message).toBe(
      "Mitglied konnte nicht aktiviert werden. (Der Termin von AT1 liegt mehr als 30 Arbeitstage in der Zukunft.)")
  })
})
