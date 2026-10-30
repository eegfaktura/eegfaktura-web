import {describe, expect, it} from "vitest";
import {countInactiveMeters, countMeters} from "../../util/MeterCount.util";
import {EegParticipant} from "../../models/members.model";

type M = {meteringPoint: string, direction: 'CONSUMPTION' | 'GENERATION', tariff_id?: string, activeSince?: string,
  status?: 'INIT' | 'ACTIVE' | 'INACTIVE'}

const participant = (...meters: M[]) => ({
  meters: meters.map(({activeSince, status, ...m}) => ({
    ...m, status: status ?? 'ACTIVE',
    participantState: activeSince ? {activeSince, inactiveSince: "2999-12-31"} : undefined,
  })),
}) as unknown as EegParticipant

describe("countMeters (platform#211)", () => {
  it("counts single participations as before", () => {
    const r = countMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "t1", activeSince: "2024-01-01"},
        {meteringPoint: "AT02", direction: 'GENERATION', tariff_id: "t2", activeSince: "2024-01-01"}),
      participant({meteringPoint: "AT03", direction: 'CONSUMPTION', tariff_id: "t1", activeSince: "2024-02-01"}),
    ], ["t1", "t2", "t3"])
    expect(r).toEqual({consumers: 2, producers: 1, tariffs: {t1: 2, t2: 1, t3: 0}})
  })

  it("counts a metering point with an owner change once, with the tariff of the newer participation", () => {
    const r = countMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "old", activeSince: "2024-01-01"}),
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "new", activeSince: "2025-06-01"}),
    ], ["old", "new"])
    expect(r).toEqual({consumers: 1, producers: 0, tariffs: {old: 0, new: 1}})
  })

  it("takes the newer participation regardless of the order in the list", () => {
    const r = countMeters([
      participant({meteringPoint: "AT02", direction: 'GENERATION', tariff_id: "new", activeSince: "2025-06-01"}),
      participant({meteringPoint: "AT02", direction: 'GENERATION', tariff_id: "old", activeSince: "2024-01-01"}),
    ], ["old", "new"])
    expect(r).toEqual({consumers: 0, producers: 1, tariffs: {old: 0, new: 1}})
  })

  it("counts a producer with an owner change once, next to the consumer of the old owner", () => {
    const r = countMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "c", activeSince: "2024-01-01"},
        {meteringPoint: "AT02", direction: 'GENERATION', tariff_id: "p", activeSince: "2024-01-01"}),
      participant({meteringPoint: "AT02", direction: 'GENERATION', tariff_id: "p2", activeSince: "2025-01-01"}),
    ], ["c", "p", "p2"])
    expect(r).toEqual({consumers: 1, producers: 1, tariffs: {c: 1, p: 0, p2: 1}})
  })

  it("prefers a participation with a start date over one without, the first one on a tie", () => {
    const r = countMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "none"}),
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "dated", activeSince: "2024-01-01"}),
      participant({meteringPoint: "AT03", direction: 'CONSUMPTION', tariff_id: "first", activeSince: "2024-01-01"}),
      participant({meteringPoint: "AT03", direction: 'CONSUMPTION', tariff_id: "second", activeSince: "2024-01-01"}),
    ], ["none", "dated", "first", "second"])
    expect(r).toEqual({consumers: 2, producers: 0, tariffs: {none: 0, dated: 1, first: 1, second: 0}})
  })

  it("counts a metering point without tariff, but no tariff for it", () => {
    const r = countMeters([participant({meteringPoint: "AT01", direction: 'CONSUMPTION'})], ["t1"])
    expect(r).toEqual({consumers: 1, producers: 0, tariffs: {t1: 0}})
  })

  it("counts consumer and producer of one member, each with its own tariff", () => {
    const r = countMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "c", activeSince: "2024-01-01"},
        {meteringPoint: "AT02", direction: 'GENERATION', tariff_id: "p", activeSince: "2024-01-01"}),
    ], ["c", "p"])
    expect(r).toEqual({consumers: 1, producers: 1, tariffs: {c: 1, p: 1}})
  })

  it("prefers the active participation over a not yet registered one with a later start", () => {
    const r = countMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "A", activeSince: "2024-01-01"}),
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "B", activeSince: "2025-06-01",
        status: 'INIT'}),
    ], ["A", "B"])
    expect(r).toEqual({consumers: 1, producers: 0, tariffs: {A: 1, B: 0}})
  })

  it("prefers a left participation over a not yet registered one", () => {
    const r = countMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "B", activeSince: "2025-06-01",
        status: 'INIT'}),
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "A", activeSince: "2024-01-01",
        status: 'INACTIVE'}),
    ], ["A", "B"])
    expect(r).toEqual({consumers: 1, producers: 0, tariffs: {A: 1, B: 0}})
  })

  it("takes the newer one when the old owner has left and the new one is active (owner change)", () => {
    const r = countMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "old", activeSince: "2024-01-01",
        status: 'INACTIVE'}),
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', tariff_id: "new", activeSince: "2025-06-01"}),
    ], ["old", "new"])
    expect(r).toEqual({consumers: 1, producers: 0, tariffs: {old: 0, new: 1}})
  })
})

// platform#228: the dashboard showed a fixed „0 inaktive“ for metering points
describe("countInactiveMeters", () => {
  it("counts metering points whose current participation is inactive", () => {
    expect(countInactiveMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', status: 'INACTIVE'},
        {meteringPoint: "AT02", direction: 'GENERATION'}),
      participant({meteringPoint: "AT03", direction: 'CONSUMPTION', status: 'INACTIVE'}),
      participant({meteringPoint: "AT04", direction: 'CONSUMPTION', status: 'INIT'}),
    ])).toBe(2)
  })

  it("does not count a metering point that left one member and is active with another one", () => {
    expect(countInactiveMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', activeSince: "2024-01-01", status: 'INACTIVE'}),
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', activeSince: "2025-06-01"}),
    ])).toBe(0)
  })

  it("counts a metering point that left twice once", () => {
    expect(countInactiveMeters([
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', activeSince: "2024-01-01", status: 'INACTIVE'}),
      participant({meteringPoint: "AT01", direction: 'CONSUMPTION', activeSince: "2025-06-01", status: 'INACTIVE'}),
    ])).toBe(1)
  })
})
