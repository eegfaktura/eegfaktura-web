import {describe, expect, it} from "vitest";
import {activeMeterEnergyArray} from "../../store";

// Dashboard "Energiemengen": with an owner change one metering point has two participations (old and new
// participant). Each participation must contribute its own value exactly once (support 6611112 / 6611148).

const meter = (participantId: string, meteringPoint: string, direction: "CONSUMPTION" | "GENERATION") =>
  ({participantId, meteringPoint, direction, tariff_id: "t1"})

const participant = (id: string, meters: any[]) => ({id, meters})

const meterReport = (meterId: string, meterDir: "CONSUMPTION" | "GENERATION", utilization: number, production = 0, allocation = 0) =>
  ({meterId, meterDir, from: 0, until: 0, report: {summary: {utilization, production, allocation}, intermediate: {}}})

const state = (participants: any[], reports: any[]) => ({
  participant: {
    ids: participants.map(p => p.id),
    entities: Object.fromEntries(participants.map(p => [p.id, p])),
  },
  energy: {
    selectedPeriod: undefined,
    participantReports: {
      ids: reports.map(r => r.participantId),
      entities: Object.fromEntries(reports.map(r => [r.participantId, r])),
    },
  },
}) as any

const values = (s: any) => activeMeterEnergyArray(s).map(e => [e.meter.participantId, e.meter.meteringPoint, e.utilization])

describe("activeMeterEnergyArray: value per participation and metering point", () => {
  it("owner change: each participation of the same metering point keeps its own value", () => {
    const s = state(
      [participant("p-old", [meter("p-old", "AT001", "CONSUMPTION")]),
       participant("p-new", [meter("p-new", "AT001", "CONSUMPTION")])],
      [{participantId: "p-old", meters: [meterReport("AT001", "CONSUMPTION", 5)]},
       {participantId: "p-new", meters: [meterReport("AT001", "CONSUMPTION", 80)]}],
    )
    expect(values(s)).toEqual([["p-old", "AT001", 5], ["p-new", "AT001", 80]])
  })

  it("owner change on a generator: production minus allocation per participation", () => {
    const s = state(
      [participant("p-old", [meter("p-old", "AT002", "GENERATION")]),
       participant("p-new", [meter("p-new", "AT002", "GENERATION")])],
      [{participantId: "p-old", meters: [meterReport("AT002", "GENERATION", 0, 10, 4)]},
       {participantId: "p-new", meters: [meterReport("AT002", "GENERATION", 0, 100, 30)]}],
    )
    expect(values(s)).toEqual([["p-old", "AT002", 6], ["p-new", "AT002", 70]])
  })

  it("single participation per metering point is unchanged", () => {
    const s = state(
      [participant("p1", [meter("p1", "AT010", "CONSUMPTION"), meter("p1", "AT011", "GENERATION")]),
       participant("p2", [meter("p2", "AT012", "CONSUMPTION")])],
      [{participantId: "p1", meters: [meterReport("AT010", "CONSUMPTION", 12), meterReport("AT011", "GENERATION", 0, 50, 20)]},
       {participantId: "p2", meters: [meterReport("AT012", "CONSUMPTION", 7)]}],
    )
    expect(values(s)).toEqual([["p1", "AT010", 12], ["p1", "AT011", 30], ["p2", "AT012", 7]])
  })

  it("a metering point without report stays undefined (dashboard skips it)", () => {
    const s = state([participant("p1", [meter("p1", "AT020", "CONSUMPTION")])], [])
    expect(values(s)).toEqual([["p1", "AT020", undefined]])
  })
})
