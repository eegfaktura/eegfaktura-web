import {EegParticipant} from "../../models/members.model";
import {Metering, ParticipantState} from "../../models/meteringpoint.model";
import {filterActiveParticipantAndMeter} from "../../util/FilterHelper.unit";
import { describe, it, expect } from "vitest";

// Real meters always carry a `status` (INIT|ACTIVE|INACTIVE); the ACTIVE/INACTIVE
// date window only governs non-INIT meters. Fully-inactive participants are dropped
// at the call site via `.filter(p => p.meters.length > 0)` (see ParticipantPane),
// so these tests mirror that end-to-end usage.
const activeParticipants = (ps: EegParticipant[], start: Date, end: Date) =>
  filterActiveParticipantAndMeter(ps, start, end).filter(p => p.meters.length > 0)

const participants = (): EegParticipant[] => [
  {id:"1", meters: [{meteringPoint:"AT1111111111111111111111111", status: "ACTIVE", processState: "ACTIVE", participantState: {activeSince: new Date(2024, 0, 31), inactiveSince: new Date(2077, 11, 31)} as ParticipantState} as Metering]} as EegParticipant,
  {id:"2", meters: [{meteringPoint:"AT1111111111111111111111112", status: "ACTIVE", processState: "INACTIVE", participantState: {activeSince: new Date(2024, 0, 31), inactiveSince: new Date(2024, 2, 31)} as ParticipantState} as Metering]} as EegParticipant
]

describe("Filter Helpers", () => {
  it("filter active participants and meters (all)", async () => {
    const ps = participants()
    // Period Jan–Jun 2024: participant 2's meter is still active at the start (inactive 31 Mar) → kept.
    expect(activeParticipants(ps, new Date(2024, 0, 31), new Date(2024, 5, 20))).toEqual(ps)
  });

  it("filter active participants and meters (1)", async () => {
    const ps = participants()
    // Period Apr–Jun 2024: participant 2's meter went inactive 31 Mar → dropped.
    expect(activeParticipants(ps, new Date(2024, 3, 1), new Date(2024, 5, 20))).toEqual([ps[0]])
  });
})
