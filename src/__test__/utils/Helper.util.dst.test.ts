// Force a DST timezone so the day-of-year round-trip is exercised across the
// CET->CEST change. The day-view arrows stepped by 2 days (and got stuck the
// other direction) in summer because dateToDayOfYear divided wall-clock ms by
// 24h, losing a day once a 23h DST day sat between Jan 1 and the date.
process.env.TZ = 'Europe/Vienna'

import { describe, it, expect } from "vitest"
import { dateToDayOfYear, dayOfYearToDate } from "../../util/Helper.util"

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
