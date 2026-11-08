import moment from "moment";
import {formatNumber} from "../../util/Number.util";
import {EegParticipant} from "../../models/members.model";
import {EegTariff} from "../../models/eeg.model";
import {MeterDirectionType, Metering} from "../../models/meteringpoint.model";
import {BillingCheckRequest, BillingCheckResponse, BillingCheckTotals} from "../../models/billingCheck.model";

// Checks before a billing run (platform#148). Their results only warn; a check that is still running delays the run.

export type CheckStatus = 'OK' | 'WARNING' | 'NOT_CHECKED'

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
  // difference: production – allocated in kWh, float noise rounded away (6 decimals); text: what the status means
  balance: { status: CheckStatus, totals?: BillingCheckTotals, difference?: number, text?: string, reason?: string }
  completeness: { status: CheckStatus, incomplete: IncompleteMeter[], reason?: string }
}

// The production counts as completely distributed when production and allocated differ by less than this.
const BALANCE_TOLERANCE_KWH = 0.01

// The difference for the dialog: three decimals, cut off rather than rounded, so a green difference never reads
// 0,01 (0,0097 -> 0,009) and a yellow one never reads 0. Float noise is rounded away first (0,006, not 0,00599...).
export const kWhDiff = (v: number) =>
  `${formatNumber(Math.trunc(Math.round(v * 1e6) / 1e3) / 1e3, 0, 3)} kWh`

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
  participants.flatMap(p => metersActiveInPeriod(p.meters, participantName(p), start, end))

/** The entries of meters active in the period [start, end], by the rules of activeMetersInPeriod. */
export const metersActiveInPeriod = (meters: Metering[], name: string, start: Date, end: Date): CheckedMeter[] =>
  meters
    .filter(m => m.status !== 'INIT' && !!m.participantState)
    .map(m => ({
      participantName: name,
      meteringPoint: m.meteringPoint,
      equipmentName: m.equipmentName,
      direction: m.direction,
      tariffId: m.tariff_id,
      // no activation date: treat as active from the start, so the meter is still checked
      activeSince: m.participantState.activeSince ? localDay(m.participantState.activeSince) : 0,
      inactiveSince: m.participantState.inactiveSince ? localDay(m.participantState.inactiveSince) : 0,
    }))
    .filter(m => m.activeSince <= localDay(end) && (m.inactiveSince === 0 || m.inactiveSince >= localDay(start)))

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
  // OK only when the production was distributed completely (difference production – allocated below 0,01 kWh).
  // One value for the status and the display: the sums carry float noise (0.01 can arrive as 0.00999...).
  const difference = Math.round((totals.produced - totals.allocated) * 1e6) / 1e6
  const balanceStatus: CheckStatus = Math.abs(difference) < BALANCE_TOLERANCE_KWH ? 'OK' : 'WARNING'
  const balanceText = balanceStatus === 'WARNING'
    ? (difference < 0 ? "Es wurde mehr Energie verteilt als produziert." : "Nicht die ganze Produktion wurde verteilt.")
    : (totals.produced === 0 && totals.allocated === 0
      ? "Keine Produktion im Zeitraum."
      : "Die Produktion wurde vollständig verteilt.")

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
    balance: {status: balanceStatus, totals, difference, text: balanceText},
    completeness: {status: incomplete.length > 0 ? 'WARNING' : 'OK', incomplete},
  }
}
