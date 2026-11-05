import {Eeg, MONTHNAME} from "../models/eeg.model";

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
// "Abr_Y-2026-…" → "2026"; another form is shown as it is
export const periodLabel = (identifier: string): string => {
  const m = /^Abr_(YM|YQ|YH|Y)-(\d{4})-(\d+)$/.exec(identifier)
  if (!m) return identifier
  const [, type, year, segment] = m
  switch (type) {
    case "YM": return MONTHNAME[Number(segment)] ? `${MONTHNAME[Number(segment)]} ${year}` : identifier
    case "YQ": return `${segment}. Quartal ${year}`
    case "YH": return `${segment}. Halbjahr ${year}`
    default: return year
  }
}

// "2026-04-01" → "1. April 2026" (read as a calendar date, no time zone)
export const longDate = (isoDate: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  return m ? `${Number(m[3])}. ${MONTHNAME[Number(m[2])]} ${m[1]}` : isoDate
}
