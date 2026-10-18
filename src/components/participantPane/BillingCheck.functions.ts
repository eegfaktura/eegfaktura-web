import moment from "moment";
import {EegParticipant} from "../../models/members.model";
import {EegTariff} from "../../models/eeg.model";
import {MeterDirectionType} from "../../models/meteringpoint.model";
import {BillingCheckRequest, BillingCheckResponse, BillingCheckTotals} from "../../models/billingCheck.model";

// Checks before a billing run (platform#148). They only warn; none of them blocks the billing.

export type CheckStatus = 'OK' | 'INFO' | 'WARNING' | 'NOT_CHECKED'

export interface CheckedMeter {
  participantName: string
  meteringPoint: string
  equipmentName?: string
  direction: MeterDirectionType
  tariffId?: string
  activeSince: number
  inactiveSince: number
}

export interface L3Finding {
  meter: CheckedMeter
  count: number
  days: string[]
}

// A metering point without energy data for its whole active part of the period.
export interface IncompleteMeter {
  meter: CheckedMeter
  expectedStart: number  // first quarter hour expected: period start or activation day
  expectedEnd: number    // last quarter hour expected: period end or the inactive day 23:45
  firstData: number | null
  lastData: number | null
  missingCount: number   // quarter hours without a value; 0 if energystore does not count them
  missingDays: string[]  // YYYY-MM-DD
}

export interface BillingCheckOverview {
  tariff: { status: CheckStatus, missing: CheckedMeter[] }
  l3: { status: CheckStatus, findings: L3Finding[], reason?: string }
  balance: { status: CheckStatus, totals?: BillingCheckTotals, reason?: string }
  completeness: { status: CheckStatus, incomplete: IncompleteMeter[], reason?: string }
}

// Rounding only; there is deliberately no percentage threshold.
const BALANCE_TOLERANCE_KWH = 0.001

// Activation dates are days; the backend sends them as UTC midnight, which is a later hour of the same
// day in local time. energystore expects the local start of the day.
const localDay = (d: Date | string) => moment(d).startOf('day').valueOf()

const participantName = (p: EegParticipant) => [p.firstname, p.lastname].filter(n => !!n).join(" ")

/**
 * All metering point entries active in the period [start, end] (the first and the last day): not INIT,
 * activeSince <= end and inactiveSince >= start. An owner change gives two entries for the same metering
 * point, each with its own tariff and dates; both are checked. All participants count, not only the
 * checked ones.
 */
export const activeMetersInPeriod = (participants: EegParticipant[], start: Date, end: Date): CheckedMeter[] =>
  participants.flatMap(p => p.meters
    .filter(m => m.status !== 'INIT' && !!m.participantState)
    .map(m => ({
      participantName: participantName(p),
      meteringPoint: m.meteringPoint,
      equipmentName: m.equipmentName,
      direction: m.direction,
      tariffId: m.tariff_id,
      // no activation date: treat as active from the start, so the meter is still checked
      activeSince: m.participantState.activeSince ? localDay(m.participantState.activeSince) : 0,
      inactiveSince: m.participantState.inactiveSince ? localDay(m.participantState.inactiveSince) : 0,
    }))
    .filter(m => m.activeSince <= localDay(end) && (m.inactiveSince === 0 || m.inactiveSince >= localDay(start))))

export const buildBillingCheckRequest = (meters: CheckedMeter[], start: Date, end: Date): BillingCheckRequest => ({
  start: start.getTime(),
  end: end.getTime(),
  cps: meters.map(m => ({
    meteringPoint: m.meteringPoint,
    direction: m.direction,
    activeSince: m.activeSince,
    inactiveSince: m.inactiveSince,
  })),
})

/** Consecutive days as ranges: ["2026-02-14", "2026-02-21", "2026-02-22"] → "14.02., 21.02.–22.02." */
export const formatDayRanges = (days: string[]): string => {
  const ranges: [moment.Moment, moment.Moment][] = []
  for (const d of days.map(x => moment(x, "YYYY-MM-DD"))) {
    const last = ranges[ranges.length - 1]
    if (last && d.diff(last[1], 'days') === 1) {
      last[1] = d
    } else {
      ranges.push([d, d])
    }
  }
  return ranges.map(([a, b]) => a.isSame(b) ? a.format("DD.MM.") : `${a.format("DD.MM.")}–${b.format("DD.MM.")}`).join(", ")
}

/** A metering point tariff is missing if none is set or it is not among the active tariffs (archived). */
export const checkTariffs = (meters: CheckedMeter[], rates: Record<string, EegTariff>): BillingCheckOverview['tariff'] => {
  const missing = meters.filter(m => !m.tariffId || !rates[m.tariffId])
  return {status: missing.length > 0 ? 'WARNING' : 'OK', missing}
}

export const evaluateBillingChecks = (
  meters: CheckedMeter[],
  rates: Record<string, EegTariff>,
  energy: BillingCheckResponse | { error: string },
): BillingCheckOverview => {
  const tariff = checkTariffs(meters, rates)

  if ('error' in energy) {
    const notChecked = {status: 'NOT_CHECKED' as CheckStatus, reason: energy.error}
    return {tariff, l3: {...notChecked, findings: []}, balance: notChecked, completeness: {...notChecked, incomplete: []}}
  }

  // energystore answers in request order, one entry per requested meter
  const findings = energy.meters
    .map((r, i) => ({meter: meters[i], count: r.l3Count, days: r.l3Days}))
    .filter(f => f.meter && f.count > 0)

  const totals = energy.totals
  const balanceStatus: CheckStatus = totals.allocated > totals.produced + BALANCE_TOLERANCE_KWH ? 'WARNING' : 'INFO'

  // Every metering point needs values for its active part of the period: from the period start or its activation
  // day to the period end or its inactive day (23:45). energystore counts the quarter hours without a value, also
  // gaps in between; an older energystore without that count is checked by the first and the last value only.
  const incomplete = energy.meters
    .map((r, i): IncompleteMeter => ({
      meter: meters[i],
      expectedStart: Math.max(energy.periodStart, r.activeSince),
      expectedEnd: r.inactiveSince > 0
        ? Math.min(energy.periodEnd, moment(r.inactiveSince).hour(23).minute(45).valueOf())
        : energy.periodEnd,
      firstData: r.firstData,
      lastData: r.lastData,
      missingCount: r.missingCount ?? 0,
      missingDays: r.missingDays ?? [],
    }))
    .filter((m, i) => m.meter && (m.firstData === null || m.lastData === null || (energy.meters[i].missingCount !== undefined
      ? m.missingCount > 0
      : m.firstData > m.expectedStart || m.lastData < m.expectedEnd)))

  return {
    tariff,
    l3: {status: findings.length > 0 ? 'WARNING' : 'OK', findings},
    balance: {status: balanceStatus, totals},
    completeness: {status: incomplete.length > 0 ? 'WARNING' : 'OK', incomplete},
  }
}
