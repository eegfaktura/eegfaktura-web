// @vitest-environment node
import {describe, expect, it} from "vitest";
import {longDate, periodLabel, settlementIntervalLabel} from "../../util/SettlementInterval.util";

describe("settlement interval texts (platform#230)", () => {
  it("names a period identifier as the backend's texts do", () => {
    expect(periodLabel("Abr_YM-2026-3")).toBe("März 2026")
    expect(periodLabel("Abr_YQ-2025-4")).toBe("4. Quartal 2025")
    expect(periodLabel("Abr_YH-2026-1")).toBe("1. Halbjahr 2026")
    expect(periodLabel("Abr_Y-2026-0")).toBe("2026")
  })

  it("shows another form as it is", () => {
    expect(periodLabel("Abr_YM-2026-13")).toBe("Abr_YM-2026-13")
    expect(periodLabel("Migration")).toBe("Migration")
  })

  it("writes a date out as a calendar date", () => {
    expect(longDate("2026-04-01")).toBe("1. April 2026")
    expect(longDate("2027-01-01")).toBe("1. Januar 2027")
  })

  it("names the intervals in German", () => {
    expect(settlementIntervalLabel("QUARTER")).toBe("Vierteljährlich")
    expect(settlementIntervalLabel("ANNUAL")).toBe("Jährlich")
  })
})
