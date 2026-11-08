import {Eeg, MONTHNAME, SettlementIntervalResult} from "../models/eeg.model";
import {createPeriodIdentifier, ReportType, SelectedPeriod} from "../models/energy.model";
import {getPeriodSegment} from "./Helper.util";

// the settlement intervals as the EEG page offers them (platform#230)
export const SETTLEMENT_INTERVALS: { key: Eeg["settlementInterval"], value: string }[] = [
  {key: "MONTHLY", value: "Monatlich"},
  {key: "QUARTER", value: "Vierteljährlich"},
  {key: "BIANNUAL", value: "Halbjährlich"},
  {key: "ANNUAL", value: "Jährlich"},
]

export const settlementIntervalLabel = (interval: string | undefined): string =>
  SETTLEMENT_INTERVALS.find(i => i.key === interval)?.value ?? interval ?? ""

// "Abr_YM-2026-3" → "März 2026", "Abr_YQ-2026-1" → "1. Quartal 2026", "Abr_YH-2026-2" → "2. Halbjahr 2026",
// "Abr_Y-2026" (also with a segment) → "2026"; another form is shown as it is
// "Jänner" as in the date picker, the backend's texts and the user guide (MONTHNAME says "Januar")
const monthName = (month: number) => month === 1 ? "Jänner" : MONTHNAME[month]

export const periodLabel = (identifier: string): string => {
  const m = /^Abr_(YM|YQ|YH|Y)-(\d{4})(?:-(\d+))?$/.exec(identifier)
  if (!m) return identifier
  const [, type, year, segment] = m
  if (type !== "Y" && !segment) return identifier
  switch (type) {
    case "YM": return MONTHNAME[Number(segment)] ? `${monthName(Number(segment))} ${year}` : identifier
    case "YQ": return `${segment}. Quartal ${year}`
    case "YH": return `${segment}. Halbjahr ${year}`
    default: return year
  }
}

// the period of the interval that contains the month (1–12) of the year; an unknown interval counts as annual
const INTERVAL_TYPE: Record<string, ReportType> = {MONTHLY: "YM", QUARTER: "YQ", BIANNUAL: "YH"}

const periodOf =(interval: string | undefined, year: number, month: number): SelectedPeriod => {
  const type = INTERVAL_TYPE[interval ?? ""] ?? "Y"
  return {type, year, segment: getPeriodSegment(type, month)}
}

// eegfaktura-dev#54 #7: after a change the first open period is the one of the new interval that starts at
// effectiveFrom ("2026-04-01", may lie in the past); null = the change applied at once, so it is today's period
export const firstOpenPeriod = (interval: string | undefined, effectiveFrom: string | null,
                                today: Date = new Date(Date.now())): SelectedPeriod => {
  const from = effectiveFrom ? /^(\d{4})-(\d{2})-\d{2}$/.exec(effectiveFrom) : null
  return from
    ? periodOf(interval, Number(from[1]), Number(from[2]))
    : periodOf(interval, today.getFullYear(), today.getMonth() + 1)
}

// the period to select after a saved change and the toast that names it; without effectiveFrom (no final billing
// yet) earlier periods may still be open, so the toast does not call today's period the next one
export const afterIntervalChange = (result: SettlementIntervalResult, today?: Date) => {
  const period = firstOpenPeriod(result.eeg?.settlementInterval, result.effectiveFrom, today)
  if (!result.effectiveFrom) return {period, message: `Abrechnungsintervall geändert. ${result.message}`}
  const next = periodLabel(createPeriodIdentifier(period.type, period.year, period.segment))
  return {period, message: `Abrechnungsintervall geändert. ${result.message} Als Nächstes abzurechnen: ${next}.`}
}

