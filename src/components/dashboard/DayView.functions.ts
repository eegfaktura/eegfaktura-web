import {ReportNamedData, SelectedPeriod} from "../../models/energy.model";
import {CpPeriodType} from "../../models/reports.model";
import {splitDate} from "../../util/Helper.util";

// One quarter hour of the whole community (sums over all metering points of a stored line).
export type QuarterHourValues = {
  ts: number            // start of the quarter hour, Unix ms
  label: string         // "HH:mm", local time
  produced: number      // producer G.01
  consumed: number      // consumer G.01
  distributed: number   // consumer G.03 (Eigendeckung)
  unused: number        // producer P.01 (Gemeinschaftsüberschuss)
}

export type HourValues = {
  ts: number
  label: string         // "HH:00", local time
  eeg: number           // Σ Eigendeckung
  evu: number           // Σ (Verbrauch − Eigendeckung)
  produced: number      // Σ Produktion
}

export type DaySums = Pick<QuarterHourValues, "produced" | "consumed" | "distributed" | "unused">

export type DayBounds = { first: Date, last: Date }

// The answer for one day; `day` is the requested day (local 00:00, Unix ms).
export type DayReportState =
  | { status: "loading", day?: number }
  | { status: "error", day: number, message: string }
  | { status: "ok", day: number, quarters: QuarterHourValues[] }

const pad = (n: number) => n.toString().padStart(2, '0')
const timeLabel = (ts: number, withMinutes: boolean) => {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${withMinutes ? pad(d.getMinutes()) : "00"}`
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const formatDay = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`

// Request window for the load-curve report of one day. energystore rounds start to 00:00 and end to 23:45 of
// their calendar days; an end on the next day's 00:00 would add the whole next day.
export const dayRequestRange = (day: Date): { start: number, end: number } => {
  const start = startOfDay(day)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 45)
  return {start: start.getTime(), end: end.getTime()}
}

// The load-curve report of a single day names each entry "R:<unix seconds>:<quarter>:<day>" (DAYRAW).
// The time is taken from the timestamp, not from the index, so DST days (92 / 100 quarter hours) stay right.
export const toQuarterHours = (report: ReportNamedData[] | undefined | null): QuarterHourValues[] => {
  if (!report) return []
  return report
    .map(r => {
      const parts = (r.name ?? "").split(':')
      const seconds = Number(parts[1])
      if (parts[0] !== 'R' || !Number.isFinite(seconds)) return undefined
      const ts = seconds * 1000
      return {
        ts,
        label: timeLabel(ts, true),
        produced: r.produced ?? 0,
        consumed: r.consumed ?? 0,
        distributed: r.distributed ?? 0,
        unused: r.unused ?? 0,
      } as QuarterHourValues
    })
    .filter((q): q is QuarterHourValues => q !== undefined)
    .sort((a, b) => a.ts - b.ts)
}

// Hourly bars from the quarter hours. Grouped by the absolute hour (Vienna offsets are whole hours), so the
// repeated 02:00 hour on the last Sunday of October stays two bars.
export const toHours = (quarters: QuarterHourValues[]): HourValues[] => {
  const hours = new Map<number, HourValues>()
  quarters.forEach(q => {
    const key = Math.floor(q.ts / 3_600_000) * 3_600_000
    const h = hours.get(key) ?? {ts: key, label: timeLabel(key, false), eeg: 0, evu: 0, produced: 0}
    h.eeg += q.distributed
    h.evu += q.consumed - q.distributed
    h.produced += q.produced
    hours.set(key, h)
  })
  return Array.from(hours.values()).sort((a, b) => a.ts - b.ts)
}

export const daySums = (quarters: QuarterHourValues[]): DaySums =>
  quarters.reduce((s, q) => ({
    produced: s.produced + q.produced,
    consumed: s.consumed + q.consumed,
    distributed: s.distributed + q.distributed,
    unused: s.unused + q.unused,
  }), {produced: 0, consumed: 0, distributed: 0, unused: 0})

export const hasEnergy = (quarters: QuarterHourValues[]) =>
  quarters.some(q => q.produced !== 0 || q.consumed !== 0 || q.distributed !== 0 || q.unused !== 0)

// First and last month (1-based) of a period.
const periodMonths = (period: SelectedPeriod): [number, number] => {
  switch (period.type) {
    case 'YH': return [period.segment * 6 - 5, period.segment * 6]
    case 'YQ': return [period.segment * 3 - 2, period.segment * 3]
    case 'YM': return [period.segment, period.segment]
    default: return [1, 12]
  }
}

// "DD.MM.YYYY HH:mm:ss" → local day, undefined if empty or invalid.
const parseDay = (s: string | undefined): Date | undefined => {
  if (!s) return undefined
  const [d, m, y] = splitDate(s)
  if (!d || !m || !y) return undefined
  return new Date(y, m - 1, d)
}

// Days the day view may show: within the selected period, within the community's energy data and not after
// yesterday (today has no complete data yet). undefined when no day qualifies.
export const dayBounds = (period: SelectedPeriod, energyData: CpPeriodType, today: Date): DayBounds | undefined => {
  if (period.type === 'D') return undefined
  const [firstMonth, lastMonth] = periodMonths(period)
  const periodStart = new Date(period.year, firstMonth - 1, 1)
  const periodEnd = new Date(period.year, lastMonth, 0)
  const dataBegin = parseDay(energyData.begin)
  const dataEnd = parseDay(energyData.end)
  if (!dataBegin || !dataEnd) return undefined
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)

  const first = new Date(Math.max(periodStart.getTime(), dataBegin.getTime()))
  const last = new Date(Math.min(periodEnd.getTime(), dataEnd.getTime(), yesterday.getTime()))
  return first.getTime() <= last.getTime() ? {first, last} : undefined
}

export const shiftDay = (day: Date, delta: number, bounds: DayBounds): Date => {
  const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + delta)
  if (next.getTime() < bounds.first.getTime()) return bounds.first
  if (next.getTime() > bounds.last.getTime()) return bounds.last
  return next
}

// Keeps a chosen day if it is still allowed, otherwise the last allowed day.
export const clampDay = (day: Date | undefined, bounds: DayBounds | undefined): Date | undefined => {
  if (!bounds) return undefined
  if (!day || day.getTime() < bounds.first.getTime() || day.getTime() > bounds.last.getTime()) return bounds.last
  return day
}

// The state to show for `day`: an answer for another day (paging, request still running) counts as loading.
export const stateForDay = (state: DayReportState, day: Date | undefined): DayReportState =>
  day && state.day === startOfDay(day).getTime() ? state : {status: "loading", day: day ? startOfDay(day).getTime() : undefined}
