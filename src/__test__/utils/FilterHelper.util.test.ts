import {splitDate} from "../../util/Helper.util";
import {EegParticipant} from "../../models/members.model";
import {Metering, ParticipantState} from "../../models/meteringpoint.model";
import {filterActiveParticipantAndMeter} from "../../util/FilterHelper.unit";
import { describe, it, expect } from "vitest";


const getDate = (y: number, m: number, d: number) => new Date(y, m, d)

describe("Filter Helpers", () => {
  it("filter active participants and meters (all)", async () => {
    const participants = [
      {id:"1", meters: [{meteringPoint:"AT1111111111111111111111111", status: "ACTIVE", participantState: {activeSince: new Date(2024, 0, 31), inactiveSince: new Date(2077, 11, 31)} as ParticipantState} as Metering]} as EegParticipant,
      {id:"2", meters: [{meteringPoint:"AT1111111111111111111111112", status: "INACTIVE", participantState: {activeSince: new Date(2024, 0, 31), inactiveSince: new Date(2024, 2, 31)} as ParticipantState} as Metering]} as EegParticipant
    ]

    const filtered = filterActiveParticipantAndMeter(participants, new Date(2024, 0, 31), new Date(2024, 5, 20))
    expect(filtered).toEqual(participants)
  });

  it("filter active participants and meters (1)", async () => {
    const participants = [
      {id:"1", meters: [{meteringPoint:"AT1111111111111111111111111", status: "ACTIVE", participantState: {activeSince: new Date(2024, 0, 31), inactiveSince: new Date(2077, 11, 31)} as ParticipantState} as Metering]} as EegParticipant,
      {id:"2", meters: [{meteringPoint:"AT1111111111111111111111112", status: "INACTIVE", participantState: {activeSince: new Date(2024, 0, 31), inactiveSince: new Date(2024, 2, 31)} as ParticipantState} as Metering]} as EegParticipant
    ]

    const filtered = filterActiveParticipantAndMeter(participants, new Date(2024, 3, 1), new Date(2024, 5, 20))
    expect(filtered).toEqual([participants[0]])
  });
})