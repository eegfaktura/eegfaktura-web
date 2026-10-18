import {describe, expect, it} from "vitest";
import moment from "moment";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import {EegTariff} from "../../../models/eeg.model";
import {BillingCheckResponse} from "../../../models/billingCheck.model";
import {
  activeMetersInPeriod,
  buildBillingCheckRequest,
  checkTariffs,
  evaluateBillingChecks,
} from "../../../components/participantPane/BillingCheck.functions";

const start = new Date(2026, 1, 1)
const end = new Date(2026, 1, 28)

const meter = (meteringPoint: string, m: Partial<Metering> & { since?: string, until?: string }): Metering => ({
  meteringPoint,
  direction: 'CONSUMPTION',
  status: 'ACTIVE',
  tariff_id: 'T1',
  participantState: {activeSince: new Date(m.since ?? "2025-01-01"), inactiveSince: new Date(m.until ?? "2999-12-31")},
  ...m,
} as Metering)

const participant = (id: string, meters: Metering[], tariffId?: string): EegParticipant =>
  ({id, firstname: "Max", lastname: id, tariffId, meters} as EegParticipant)

const rates = {T1: {id: 'T1', type: 'VZP'} as EegTariff}

const energy = (over: Partial<BillingCheckResponse> = {}): BillingCheckResponse => ({
  periodStart: start.getTime(),
  periodEnd: moment(end).hour(23).minute(45).valueOf(),
  meters: [],
  totals: {produced: 100, consumed: 120, allocated: 80, selfCovered: 70, surplus: 20},
  ...over,
})

describe("BillingCheck functions", () => {
  it("selects metering points active in the period, owner change gives two entries", () => {
    const meters = activeMetersInPeriod([
      participant("A", [
        meter("AT1", {}),
        meter("AT2", {until: "2026-01-31"}),            // inactive before the period
        meter("AT3", {since: "2026-03-01"}),            // active after the period
        meter("AT4", {status: 'INIT'}),                 // never activated
        meter("AT5", {since: "2026-02-28"}),            // activated on the last day
      ]),
      participant("B", [meter("AT6", {until: "2026-02-10"})]),  // earlier owner
      participant("C", [meter("AT6", {since: "2026-02-11"})]),  // new owner
    ], start, end)

    expect(meters.map(m => `${m.participantName}:${m.meteringPoint}`))
      .toEqual(["Max A:AT1", "Max A:AT5", "Max B:AT6", "Max C:AT6"])
  })

  it("warns for a missing or archived metering point tariff, not for a missing member fee tariff", () => {
    const meters = activeMetersInPeriod([
      participant("A", [meter("AT1", {})]),                         // member without fee tariff: OK
      participant("B", [meter("AT2", {tariff_id: undefined as unknown as string})]),
      participant("C", [meter("AT3", {tariff_id: "ARCHIVED"})]),   // not among the active tariffs
    ], start, end)

    const result = checkTariffs(meters, rates)
    expect(result.status).toBe('WARNING')
    expect(result.missing.map(m => m.meteringPoint)).toEqual(["AT2", "AT3"])
    expect(checkTariffs(meters.slice(0, 1), rates).status).toBe('OK')
  })

  it("builds the request with the active windows in order", () => {
    const meters = activeMetersInPeriod([participant("A", [meter("AT1", {since: "2026-02-05"})])], start, end)
    expect(buildBillingCheckRequest(meters, start, end)).toEqual({
      start: start.getTime(),
      end: end.getTime(),
      cps: [{meteringPoint: "AT1", direction: 'CONSUMPTION',
        activeSince: new Date(2026, 1, 5).getTime(), inactiveSince: new Date(2999, 11, 31).getTime()}],
    })
  })

  it("evaluates L3, balance and completeness", () => {
    const meters = activeMetersInPeriod([participant("A", [meter("AT1", {}), meter("AT2", {})])], start, end)
    const e = energy()
    const full = {firstData: e.periodStart, lastData: e.periodEnd}

    const ok = evaluateBillingChecks(meters, rates, energy({
      meters: [
        {...buildBillingCheckRequest(meters, start, end).cps[0], l3Count: 0, l3Days: [], ...full},
        {...buildBillingCheckRequest(meters, start, end).cps[1], l3Count: 0, l3Days: [], ...full},
      ],
    }))
    expect(ok.l3.status).toBe('OK')
    expect(ok.balance.status).toBe('INFO')
    expect(ok.completeness.status).toBe('OK')

    const until = moment(end).subtract(2, 'day').hour(23).minute(45).valueOf()
    const warn = evaluateBillingChecks(meters, rates, energy({
      meters: [
        {...buildBillingCheckRequest(meters, start, end).cps[0], l3Count: 0, l3Days: [], firstData: e.periodStart, lastData: until},
        {...buildBillingCheckRequest(meters, start, end).cps[1], l3Count: 2, l3Days: ["2026-02-10"], firstData: e.periodStart, lastData: until},
      ],
      totals: {...e.totals, allocated: 100.01},
    }))
    expect(warn.l3.status).toBe('WARNING')
    expect(warn.l3.findings).toHaveLength(1)
    expect(warn.l3.findings[0]).toMatchObject({count: 2, days: ["2026-02-10"]})
    expect(warn.l3.findings[0].meter.meteringPoint).toBe("AT2")
    expect(warn.balance.status).toBe('WARNING')
    expect(warn.completeness.status).toBe('WARNING')
    expect(warn.completeness.incomplete.map(m => [m.meter.meteringPoint, m.lastData])).toEqual([["AT1", until], ["AT2", until]])
  })

  it("completeness is checked per metering point within its active part of the period", () => {
    const e = energy()
    const meters = activeMetersInPeriod([
      participant("A", [
        meter("AT1", {}),                         // whole period, complete
        meter("AT2", {since: "2026-02-05"}),      // activated on 05.02., complete from then
        meter("AT3", {until: "2026-02-10"}),      // inactive since 10.02., complete until then
        meter("AT4", {}),                         // data only from 04.02.
        meter("AT5", {until: "2026-02-10"}),      // inactive since 10.02., data only until 09.02.
        meter("AT6", {}),                         // no data
      ]),
    ], start, end)
    const cps = buildBillingCheckRequest(meters, start, end).cps
    const day = (d: number, h = 0, m = 0) => new Date(2026, 1, d, h, m).getTime()
    const data: [number | null, number | null][] = [
      [e.periodStart, e.periodEnd],
      [day(5), e.periodEnd],
      [e.periodStart, day(10, 23, 45)],
      [day(4), e.periodEnd],
      [e.periodStart, day(9, 23, 45)],
      [null, null],
    ]
    const res = evaluateBillingChecks(meters, rates, energy({
      meters: cps.map((cp, i) => ({...cp, l3Count: 0, l3Days: [], firstData: data[i][0], lastData: data[i][1]})),
    }))
    expect(res.completeness.status).toBe('WARNING')
    expect(res.completeness.incomplete.map(m => m.meter.meteringPoint)).toEqual(["AT4", "AT5", "AT6"])
    expect(res.completeness.incomplete[1].expectedEnd).toBe(day(10, 23, 45))

    // all complete within their windows
    const ok = evaluateBillingChecks(meters.slice(0, 3), rates, energy({
      meters: cps.slice(0, 3).map((cp, i) => ({...cp, l3Count: 0, l3Days: [], firstData: data[i][0], lastData: data[i][1]})),
    }))
    expect(ok.completeness).toEqual({status: 'OK', incomplete: []})
  })

  it("a meter without activation date is still checked", () => {
    const meters = activeMetersInPeriod([participant("A", [
      {...meter("AT1", {tariff_id: undefined as unknown as string}), participantState: {activeSince: null, inactiveSince: null}} as unknown as Metering,
    ])], start, end)
    expect(meters).toHaveLength(1)
    expect(checkTariffs(meters, rates).status).toBe('WARNING')
  })

  it("rounding differences in the balance are no warning", () => {
    const res = evaluateBillingChecks([], rates, energy({totals: {produced: 100, consumed: 0, allocated: 100.0005, selfCovered: 0, surplus: 0}}))
    expect(res.balance.status).toBe('INFO')
  })

  it("no energy data in the period", () => {
    const meters = activeMetersInPeriod([participant("A", [meter("AT1", {})])], start, end)
    const res = evaluateBillingChecks(meters, rates, energy({
      meters: [{...buildBillingCheckRequest(meters, start, end).cps[0], l3Count: 0, l3Days: [], firstData: null, lastData: null}],
      totals: {produced: 0, consumed: 0, allocated: 0, selfCovered: 0, surplus: 0},
    }))
    expect(res.completeness.status).toBe('WARNING')
    expect(res.completeness.incomplete).toHaveLength(1)
    expect(res.balance.status).toBe('INFO')
  })

  it("energystore not reachable: tariff check still runs, the others are not checked", () => {
    const meters = activeMetersInPeriod([participant("A", [meter("AT1", {tariff_id: "X"})])], start, end)
    const res = evaluateBillingChecks(meters, rates, {error: "down"})
    expect(res.tariff.status).toBe('WARNING')
    expect(res.l3.status).toBe('NOT_CHECKED')
    expect(res.balance.status).toBe('NOT_CHECKED')
    expect(res.completeness).toEqual({status: 'NOT_CHECKED', reason: "down", incomplete: []})
  })
})
