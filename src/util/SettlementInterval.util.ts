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

