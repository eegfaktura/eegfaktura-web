// @vitest-environment node
// A DST timezone (the suite runs in Europe/Vienna, vite.config.ts test.env) exercises the
// day-of-year round-trip across the CET->CEST change. The day-view arrows stepped by 2 days (and got stuck the
// other direction) in summer because dateToDayOfYear divided wall-clock ms by
// 24h, losing a day once a 23h DST day sat between Jan 1 and the date.

import { describe, it, expect } from "vitest"
import { dateToDayOfYear, dayOfYearToDate, startOfNextDay } from "../../util/Helper.util"

describe("dateToDayOfYear / dayOfYearToDate (DST-safe)", () => {
  it("round-trips every day of a non-leap and a leap year, incl. across DST", () => {
    for (const year of [2023, 2024]) {
      const days = year % 4 === 0 ? 366 : 365
      for (let doy = 1; doy <= days; doy++) {
        expect(dateToDayOfYear(dayOfYearToDate(year, doy))).toBe(doy)
      }
    }
  })

  it("steps exactly one day forward and back on a summer date (CEST)", () => {
    // 19 Jun 2026 is CEST (+2), an hour ahead of the Jan 1 CET (+1) baseline —
    // the case that broke the day-view navigation.
    const seg = dateToDayOfYear(new Date(2026, 5, 19))
    const next = dayOfYearToDate(2026, seg); next.setDate(next.getDate() + 1)
    const prev = dayOfYearToDate(2026, seg); prev.setDate(prev.getDate() - 1)
    expect(dateToDayOfYear(next)).toBe(seg + 1)
    expect(dateToDayOfYear(prev)).toBe(seg - 1)
  })
})

// web 261128-mm1: the end was the last day + 24 h; on the autumn DST day (25 h) that stayed on the same day and the
// backend, which takes the day of the end as exclusive bound, left out the messages of that day.
describe("startOfNextDay (process history range end)", () => {
  it("is 00:00 of the next day on the autumn DST day (25 h)", () => {
    const lastDay = new Date(2026, 9, 25)
    expect(new Date(2026, 9, 26).getTime() - lastDay.getTime()).toBe(25 * 3600 * 1000) // runs in Europe/Vienna
    expect(startOfNextDay(lastDay)).toBe(new Date("2026-10-26T00:00:00+01:00").getTime())
  })

  it("is 00:00 of the next day on the spring DST day (23 h)", () => {
    const lastDay = new Date(2026, 2, 29)
    expect(new Date(2026, 2, 30).getTime() - lastDay.getTime()).toBe(23 * 3600 * 1000)
    expect(startOfNextDay(lastDay)).toBe(new Date("2026-03-30T00:00:00+02:00").getTime())
  })

  it("ignores the time of day of the last day and crosses month and year ends", () => {
    expect(startOfNextDay(new Date(2026, 10, 28, 14, 30))).toBe(new Date(2026, 10, 29).getTime())
    expect(startOfNextDay(new Date(2026, 11, 31, 23, 59))).toBe(new Date(2027, 0, 1).getTime())
  })
})
