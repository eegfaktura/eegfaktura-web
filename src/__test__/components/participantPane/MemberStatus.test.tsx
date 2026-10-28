import React from "react";
import {screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import MemberComponent from "../../../components/participantPane/Member.component";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import {renderWithProviders} from "../../test-utils";
import {initialState as participantInitial} from "../../../store/participant/states/participant.state";

const meter = (meteringPoint: string, status: string, processState: string) =>
  ({meteringPoint, direction: 'CONSUMPTION', status, processState}) as unknown as Metering

const member = (meters: Metering[]) => ({
  id: "m1", firstname: "Max", lastname: "Mustermann", businessRole: 'EEG_PRIVATE', status: 'ACTIVE', meters,
}) as unknown as EegParticipant

const renderMember = (listEntry: EegParticipant, stored: EegParticipant) => renderWithProviders(
  <MemberComponent hideMember={false} hideMeter={false} participant={listEntry}
                   showDetailsPage={() => {}} showAmount={false}
                   onShowAddMeterPage={() => () => vi.fn()}/>,
  {preloadedState: {participant: {...participantInitial, ids: [stored.id], entities: {[stored.id]: stored}}}})

describe("member status in the list (platform#165)", () => {
  const active = meter("AT1", "ACTIVE", "ACTIVE")
  const left = meter("AT2", "INACTIVE", "INACTIVE")

  it("does not mark an active member whose list entry shows only its inactive metering point (filter)", () => {
    renderMember(member([left]), member([active, left]))
    expect(screen.queryByText("inaktiv")).toBeNull()
  })

  it("marks a member whose metering points all left, also when the period hides them", () => {
    renderMember(member([]), member([left]))
    expect(screen.getByText("inaktiv")).toBeTruthy()
  })
})
