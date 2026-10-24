import { describe, it, expect } from "vitest";
import {partFactChanges} from "../../../components/processDetails/ProcessChangeParticipantFactor.component";
import {Metering} from "../../../models/meteringpoint.model";

const meter = {
  meteringPoint: "AT0030000000000000000000000000001",
  direction: "CONSUMPTION",
  gridOperatorId: "AT003000",
  participantState: {activeSince: new Date("2026-01-01")},
} as unknown as Metering

describe("partFactChanges", () => {
  it("sends the factor the user entered", () => {
    expect(partFactChanges([meter], 40)[0].partFact).toBe(40)
  })

  it("does not turn a low factor into 100 %", () => {
    // was `partFact || 100`: 0 went to the grid operator as 100 %. 0 is now rejected by the form rule.
    expect(partFactChanges([meter], 0)[0].partFact).toBe(0)
  })
})
