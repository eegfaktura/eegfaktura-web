// The day view works in local time; force Vienna so the DST days are exercised.
process.env.TZ = 'Europe/Vienna'

import {describe, expect, it} from "vitest"
import {
  clampDay, dayBounds, dayRequestRange, daySums, formatDay, hasEnergy, shiftDay, stateForDay, toHours, toQuarterHours
} from "../../../components/dashboard/DayView.functions"
import {DayReportState} from "../../../components/dashboard/DayView.functions"
import {ReportNamedData} from "../../../models/energy.model"

// A DAYRAW entry of the load-curve report for the quarter hour starting at `ts`.
const entry = (ts: number, v: Partial<ReportNamedData> = {}): ReportNamedData => {
  const d = new Date(ts)
  return {
    name: `R:${ts / 1000}:${(d.getHours() * 4 + d.getMinutes() / 15).toString().padStart(2, '0')}:${d.getDate()}`,
    consumed: 0, allocated: 0, distributed: 0, produced: 0, unused: 0,
    qoVConsumer: 1, qoVProducer: 1, cntConsumer: 0, cntProducer: 0, ...v,
  }
}

// All quarter hours of a local day, as energystore stores them (start of each interval).
const quarterHours = (y: number, m: number, d: number): number[] => {
  const out: number[] = []
  const end = new Date(y, m - 1, d + 1).getTime()
  for (let ts = new Date(y, m - 1, d).getTime(); ts < end; ts += 15 * 60_000) out.push(ts)
  return out
}

describe("dayRequestRange", () => {
  it("asks for 00:00 to 23:45 of the same day, never the next day's 00:00", () => {
    const {start, end} = dayRequestRange(new Date(2026, 9, 23, 14, 30))
    expect(new Date(start)).toEqual(new Date(2026, 9, 23, 0, 0))
    expect(new Date(end)).toEqual(new Date(2026, 9, 23, 23, 45))
  })
})

describe("toQuarterHours", () => {
  it("maps produced / consumed / Eigendeckung / surplus and takes the time from the name", () => {
    const ts = new Date(2026, 5, 1, 12, 15).getTime()
    const q = toQuarterHours([entry(ts, {produced: 4, consumed: 3, distributed: 2, unused: 1.5, allocated: 2.5})])
    expect(q).toEqual([{ts, label: "12:15", produced: 4, consumed: 3, distributed: 2, unused: 1.5}])
  })

  it("sorts by time, ignores entries that are not quarter hours and treats a missing surplus as 0", () => {
    const a = new Date(2026, 5, 1, 0, 0).getTime(), b = new Date(2026, 5, 1, 0, 15).getTime()
    const noUnused = {...entry(b, {produced: 1}), unused: undefined}
    const q = toQuarterHours([noUnused, {...entry(a), name: "D:06:01:00"}, entry(a, {consumed: 2})])
    expect(q.map(x => x.label)).toEqual(["00:00", "00:15"])
    expect(q[1].unused).toBe(0)
  })

  it("returns nothing for a missing report", () => {
    expect(toQuarterHours(undefined)).toEqual([])
    expect(toQuarterHours(null)).toEqual([])
  })
})

describe("toHours", () => {
  it("sums four quarter hours per hour: EEG = Eigendeckung, EVU = Verbrauch − Eigendeckung", () => {
    const report = quarterHours(2026, 6, 1).map((ts, i) => entry(ts, {consumed: 1, distributed: 0.25, produced: i}))
    const hours = toHours(toQuarterHours(report))
    expect(hours).toHaveLength(24)
    expect(hours[0]).toEqual({ts: new Date(2026, 5, 1).getTime(), label: "00:00", eeg: 1, evu: 3, produced: 0 + 1 + 2 + 3})
    expect(hours[23].label).toBe("23:00")
    expect(hours[23].produced).toBe(92 + 93 + 94 + 95)
  })

  it("the hours add up to the quarter hours (day sums)", () => {
    const report = quarterHours(2026, 6, 1).map((ts, i) => entry(ts, {consumed: i % 7, distributed: i % 3, produced: i % 5}))
    const q = toQuarterHours(report)
    const s = daySums(q)
    const h = toHours(q)
    expect(h.reduce((t, x) => t + x.eeg, 0)).toBeCloseTo(s.distributed, 9)
    expect(h.reduce((t, x) => t + x.eeg + x.evu, 0)).toBeCloseTo(s.consumed, 9)
    expect(h.reduce((t, x) => t + x.produced, 0)).toBeCloseTo(s.produced, 9)
  })

  it("spring DST day (29.03.2026): 92 quarter hours, 23 hours, no 02:00", () => {
    const q = toQuarterHours(quarterHours(2026, 3, 29).map(ts => entry(ts, {consumed: 1})))
    expect(q).toHaveLength(92)
    const h = toHours(q)
    expect(h).toHaveLength(23)
    expect(h.map(x => x.label)).not.toContain("02:00")
    expect(h.reduce((t, x) => t + x.evu, 0)).toBe(92)
  })

  it("autumn DST day (25.10.2026): 100 quarter hours, 25 hours, 02:00 twice", () => {
    const q = toQuarterHours(quarterHours(2026, 10, 25).map(ts => entry(ts, {produced: 1})))
    expect(q).toHaveLength(100)
    const h = toHours(q)
    expect(h).toHaveLength(25)
    expect(h.filter(x => x.label === "02:00")).toHaveLength(2)
    expect(h.every(x => x.produced === 4)).toBe(true)
  })
})

describe("daySums / hasEnergy", () => {
  it("sums all four values", () => {
    const ts = new Date(2026, 5, 1).getTime()
    const q = toQuarterHours([
      entry(ts, {produced: 1, consumed: 2, distributed: 0.5, unused: 0.5}),
      entry(ts + 900_000, {produced: 3, consumed: 1, distributed: 1, unused: 2}),
    ])
    expect(daySums(q)).toEqual({produced: 4, consumed: 3, distributed: 1.5, unused: 2.5})
    expect(hasEnergy(q)).toBe(true)
  })

  it("a day of zeros or without entries has no energy", () => {
    expect(hasEnergy([])).toBe(false)
    expect(hasEnergy(toQuarterHours([entry(new Date(2026, 5, 1).getTime())]))).toBe(false)
  })
})

describe("dayBounds", () => {
  const data = {begin: "15.03.2025 00:00:00", end: "20.10.2026 23:45:00"}
  const today = new Date(2026, 9, 24, 9, 0)

  it("a past month inside the data: the whole month", () => {
    expect(dayBounds({type: "YM", year: 2026, segment: 2}, data, today))
      .toEqual({first: new Date(2026, 1, 1), last: new Date(2026, 1, 28)})
  })

  it("starts at the data begin and ends at the data end", () => {
    expect(dayBounds({type: "Y", year: 2025, segment: 0}, data, today)?.first).toEqual(new Date(2025, 2, 15))
    expect(dayBounds({type: "YM", year: 2026, segment: 10}, data, today)?.last).toEqual(new Date(2026, 9, 20))
  })

  it("never after yesterday", () => {
    const fresh = {begin: data.begin, end: "31.12.2026 23:45:00"}
    expect(dayBounds({type: "YQ", year: 2026, segment: 4}, fresh, today))
      .toEqual({first: new Date(2026, 9, 1), last: new Date(2026, 9, 23)})
  })

  it("half year and quarter cover their months", () => {
    expect(dayBounds({type: "YH", year: 2025, segment: 2}, data, today))
      .toEqual({first: new Date(2025, 6, 1), last: new Date(2025, 11, 31)})
    expect(dayBounds({type: "YQ", year: 2025, segment: 2}, data, today))
      .toEqual({first: new Date(2025, 3, 1), last: new Date(2025, 5, 30)})
  })

  it("no day: period without data, no energy data at all, or a day period", () => {
    expect(dayBounds({type: "YM", year: 2024, segment: 5}, data, today)).toBeUndefined()
    expect(dayBounds({type: "YM", year: 2026, segment: 11}, data, today)).toBeUndefined()
    expect(dayBounds({type: "YM", year: 2026, segment: 2}, {begin: "24.10.2026 09:00:00", end: ""}, today)).toBeUndefined()
    expect(dayBounds({type: "D", year: 2026, segment: 40}, data, today)).toBeUndefined()
  })
})

describe("shiftDay / clampDay", () => {
  const bounds = {first: new Date(2026, 2, 1), last: new Date(2026, 2, 31)}

  it("steps one calendar day, also across the DST change", () => {
    expect(shiftDay(new Date(2026, 2, 28), 1, bounds)).toEqual(new Date(2026, 2, 29))
    expect(shiftDay(new Date(2026, 2, 29), 1, bounds)).toEqual(new Date(2026, 2, 30))
    expect(shiftDay(new Date(2026, 2, 30), -1, bounds)).toEqual(new Date(2026, 2, 29))
  })

  it("stays inside the bounds", () => {
    expect(shiftDay(new Date(2026, 2, 31), 1, bounds)).toEqual(new Date(2026, 2, 31))
    expect(shiftDay(new Date(2026, 2, 1), -1, bounds)).toEqual(new Date(2026, 2, 1))
  })

  it("keeps an allowed day, otherwise falls back to the last allowed day", () => {
    expect(clampDay(new Date(2026, 2, 10), bounds)).toEqual(new Date(2026, 2, 10))
    expect(clampDay(new Date(2026, 3, 10), bounds)).toEqual(new Date(2026, 2, 31))
    expect(clampDay(undefined, bounds)).toEqual(new Date(2026, 2, 31))
    expect(clampDay(new Date(2026, 2, 10), undefined)).toBeUndefined()
  })

  it("formats the day as TT.MM.JJJJ", () => {
    expect(formatDay(new Date(2026, 0, 5))).toBe("05.01.2026")
  })
})

describe("stateForDay", () => {
  const oct22 = new Date(2026, 9, 22), oct23 = new Date(2026, 9, 23)
  const ok: DayReportState = {status: "ok", day: oct22.getTime(), quarters: []}

  it("an answer for another day counts as loading (no old values under the new date)", () => {
    expect(stateForDay(ok, oct23)).toEqual({status: "loading", day: oct23.getTime()})
    expect(stateForDay({status: "error", day: oct22.getTime(), message: "x"}, oct23).status).toBe("loading")
  })

  it("an answer for the shown day is kept", () => {
    expect(stateForDay(ok, new Date(2026, 9, 22))).toBe(ok)
  })

  it("no day: loading", () => {
    expect(stateForDay(ok, undefined).status).toBe("loading")
  })
})
