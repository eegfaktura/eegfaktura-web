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

  it("a rejected re-registration after leaving stays out of the period (billing, reports)", async () => {
    const rejected = {id: "3", meters: [{meteringPoint: "AT1111111111111111111111113", status: "INACTIVE", processState: "REJECTED",
      participantState: {activeSince: new Date(2024, 0, 31), inactiveSince: new Date(2024, 2, 31)} as ParticipantState} as Metering]} as EegParticipant
    const activeRejected = {id: "5", meters: [{meteringPoint: "AT1111111111111111111111115", status: "ACTIVE", processState: "REJECTED",
      participantState: {activeSince: new Date(2024, 6, 1), inactiveSince: new Date(2999, 11, 31)} as ParticipantState} as Metering]} as EegParticipant
    // Apr–Jun 2024: after the first one left and before the second one joined — neither may be billed
    expect(activeParticipants([rejected, activeRejected], new Date(2024, 3, 1), new Date(2024, 5, 20))).toEqual([])
  });

  // web 261128-mm3: the end was the last day + 24 h. When the last day of the period is the autumn DST day (25 h, e.g.
  // 31.10.2027), that stayed on the same day, and the month was filtered differently from every other month.
  it("a period ending on the autumn DST day ends at 00:00 of the next day, like every other period", async () => {
    const fromNextDay = (y: number, m: number, d: number) => ({id: "4", meters: [{meteringPoint: "AT1111111111111111111111114",
      status: "ACTIVE", processState: "ACTIVE",
      participantState: {activeSince: new Date(y, m, d), inactiveSince: new Date(2999, 11, 31)} as ParticipantState} as Metering]} as EegParticipant)
    const november2026 = activeParticipants([fromNextDay(2026, 11, 1)], new Date(2026, 10, 1), new Date(2026, 10, 30))
    const october2027 = activeParticipants([fromNextDay(2027, 10, 1)], new Date(2027, 9, 1), new Date(2027, 9, 31))
    expect(october2027.length).toBe(november2026.length)
  });

  it("filter active participants and meters (1)", async () => {
    const ps = participants()
    // Period Apr–Jun 2024: participant 2's meter went inactive 31 Mar → dropped.
    expect(activeParticipants(ps, new Date(2024, 3, 1), new Date(2024, 5, 20))).toEqual([ps[0]])
  });
})
