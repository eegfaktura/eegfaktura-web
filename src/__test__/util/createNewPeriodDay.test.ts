import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createNewPeriod, dayOfYearToDate, toLocalISODate} from "../../util/Helper.util";
import {SelectedPeriod} from "../../models/energy.model";

// Day view ("D") of the metering point chart: it opens on the last day with data, at most yesterday
// (wish Harald 25.10.2026: "yesterday" usually has no data yet).

const q4: SelectedPeriod = {type: "YQ", year: 2026, segment: 4}
const range = (begin: string, end: string) => ({begin, end})
const isoDay = (p: SelectedPeriod | undefined) => p && toLocalISODate(dayOfYearToDate(p.year, p.segment))

describe("createNewPeriod 'D'", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0))   // 25.10.2026
  })
  afterEach(() => vi.useRealTimers())

  it("opens on the last day with data when the data ends before yesterday", () => {
    expect(isoDay(createNewPeriod(q4, 'D', 1, range("01.01.2026 00:00:00", "21.10.2026 23:45:00")))).toBe("2026-10-21")
  })

  it("opens on yesterday when the data reaches yesterday or later", () => {
    expect(isoDay(createNewPeriod(q4, 'D', 1, range("01.01.2026 00:00:00", "24.10.2026 23:45:00")))).toBe("2026-10-24")
    expect(isoDay(createNewPeriod(q4, 'D', 1, range("01.01.2026 00:00:00", "25.10.2026 10:00:00")))).toBe("2026-10-24")
  })

  it("opens on yesterday without a known data end", () => {
    expect(isoDay(createNewPeriod(q4, 'D', 1))).toBe("2026-10-24")
    expect(isoDay(createNewPeriod(q4, 'D', 1, range("25.10.2026 12:00:00", "")))).toBe("2026-10-24")
  })

  it("keeps the year of the last day with data across a year boundary", () => {
    vi.setSystemTime(new Date(2026, 0, 2, 12, 0))   // 02.01.2026, data until 30.12.2025
    const p = createNewPeriod({type: "YM", year: 2026, segment: 1}, 'D', 1, range("01.01.2025 00:00:00", "30.12.2025 23:45:00"))
    expect(p?.year).toBe(2025)
    expect(isoDay(p)).toBe("2025-12-30")
  })

  it("a second 'D' after the jump into the earlier year stays on the last day with data", () => {
    vi.setSystemTime(new Date(2026, 0, 2, 12, 0))   // 02.01.2026, data until 30.12.2025
    const p = createNewPeriod({type: "YM", year: 2025, segment: 12}, 'D', 1, range("01.03.2023 00:00:00", "30.12.2025 23:45:00"))
    expect(isoDay(p)).toBe("2025-12-30")
  })

  it("a metering point whose data ended in the selected earlier year opens on its last day with data", () => {
    expect(isoDay(createNewPeriod({type: "Y", year: 2024, segment: 0}, 'D', 1,
      range("01.01.2023 00:00:00", "15.06.2024 23:45:00")))).toBe("2024-06-15")
  })

  it("a period of an earlier year still opens on the start of the range", () => {
    expect(isoDay(createNewPeriod({type: "Y", year: 2025, segment: 0}, 'D', 1,
      range("01.03.2025 00:00:00", "21.10.2026 23:45:00")))).toBe("2025-03-01")
  })
})
