// @vitest-environment node
import {describe, expect, it} from "vitest";
import {periodLabel, settlementIntervalLabel} from "../../util/SettlementInterval.util";

describe("settlement interval texts (platform#230)", () => {
  it("names a period identifier as the backend's texts do", () => {
    expect(periodLabel("Abr_YM-2026-3")).toBe("März 2026")
    expect(periodLabel("Abr_YQ-2025-4")).toBe("4. Quartal 2025")
    expect(periodLabel("Abr_YH-2026-1")).toBe("1. Halbjahr 2026")
    expect(periodLabel("Abr_YM-2026-1")).toBe("Jänner 2026")
    expect(periodLabel("Abr_Y-2026-0")).toBe("2026")
    expect(periodLabel("Abr_Y-2025")).toBe("2025")
  })

  it("shows another form as it is", () => {
    expect(periodLabel("Abr_YM-2026-13")).toBe("Abr_YM-2026-13")
    expect(periodLabel("Abr_YQ-2026")).toBe("Abr_YQ-2026")
    expect(periodLabel("Migration")).toBe("Migration")
  })

  it("names the intervals in German", () => {
    expect(settlementIntervalLabel("QUARTER")).toBe("Vierteljährlich")
    expect(settlementIntervalLabel("ANNUAL")).toBe("Jährlich")
  })
})
