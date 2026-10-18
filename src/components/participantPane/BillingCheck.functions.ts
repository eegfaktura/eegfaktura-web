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

export interface BillingCheckOverview {
  tariff: { status: CheckStatus, missing: CheckedMeter[] }
  l3: { status: CheckStatus, findings: L3Finding[], reason?: string }
  balance: { status: CheckStatus, totals?: BillingCheckTotals, reason?: string }
  // dataFrom/dataUntil: earliest first and latest last quarter hour with a value over all metering points
  // endReached: some metering point has values until the end of the period (then data is missing at the start)
  completeness: { status: CheckStatus, dataFrom?: number, dataUntil?: number, endReached?: boolean, reason?: string }
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
    return {tariff, l3: {...notChecked, findings: []}, balance: notChecked, completeness: notChecked}
  }

  // energystore answers in request order, one entry per requested meter
  const findings = energy.meters
    .map((r, i) => ({meter: meters[i], count: r.l3Count, days: r.l3Days}))
    .filter(f => f.meter && f.count > 0)

  const totals = energy.totals
  const balanceStatus: CheckStatus = totals.allocated > totals.produced + BALANCE_TOLERANCE_KWH ? 'WARNING' : 'INFO'

  // Complete if a metering point active until the end of the period has values from the expected start to the
  // end. The expected start is the period start, or the first activation of any requested metering point if that
  // is later: a community that starts mid-period is complete without data before its start, but one meter
  // activated mid-period does not hide a gap of the others.
  const expectedStart = Math.max(energy.periodStart, Math.min(...energy.meters.map(r => r.activeSince)))
  const untilEnd = energy.meters.filter(r =>
    r.lastData !== null && r.lastData >= energy.periodEnd &&
    (r.inactiveSince <= 0 || r.inactiveSince >= localDay(new Date(energy.periodEnd))))
  const covered = untilEnd.some(r => r.firstData !== null && r.firstData <= expectedStart)
  // „vorhanden ab“ refers to the metering points that reach the end of the period
  const first = untilEnd.map(r => r.firstData).filter((t): t is number => t !== null)
  const last = energy.meters.map(r => r.lastData).filter((t): t is number => t !== null)

  return {
    tariff,
    l3: {status: findings.length > 0 ? 'WARNING' : 'OK', findings},
    balance: {status: balanceStatus, totals},
    completeness: {
      status: covered ? 'OK' : 'WARNING',
      dataFrom: first.length > 0 ? Math.min(...first) : undefined,
      dataUntil: last.length > 0 ? Math.max(...last) : undefined,
      endReached: untilEnd.length > 0,
    },
  }
}
