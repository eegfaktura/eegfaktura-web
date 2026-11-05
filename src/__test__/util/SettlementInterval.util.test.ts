// @vitest-environment node
import {describe, expect, it} from "vitest";
import {
  afterIntervalChange, firstOpenPeriod, periodLabel, settlementIntervalLabel
} from "../../util/SettlementInterval.util";
import {Eeg, SettlementIntervalResult} from "../../models/eeg.model";

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

describe("first open period after an interval change (eegfaktura-dev#54 #7)", () => {
  const today = new Date(2026, 10, 5) // 5 November 2026
  const changed = (settlementInterval: Eeg["settlementInterval"], effectiveFrom: string | null,
                   message: string): SettlementIntervalResult => ({
    allowed: true, effectiveFrom, lastFinalPeriod: null, message, earliestFrom: null,
    eeg: {settlementInterval} as Eeg,
  })

  it("is the period of the new interval that starts at effectiveFrom, also in the past", () => {
    expect(firstOpenPeriod("QUARTER", "2026-04-01", today)).toEqual({type: "YQ", year: 2026, segment: 2})
    expect(firstOpenPeriod("BIANNUAL", "2026-07-01", today)).toEqual({type: "YH", year: 2026, segment: 2})
    expect(firstOpenPeriod("MONTHLY", "2026-02-01", today)).toEqual({type: "YM", year: 2026, segment: 2})
    expect(firstOpenPeriod("ANNUAL", "2027-01-01", today)).toEqual({type: "Y", year: 2027, segment: 0})
  })

  it("is today's period when the change applied at once", () => {
    expect(firstOpenPeriod("QUARTER", null, today)).toEqual({type: "YQ", year: 2026, segment: 4})
    expect(firstOpenPeriod("MONTHLY", null, today)).toEqual({type: "YM", year: 2026, segment: 11})
  })

  it("selects that period and names it in the toast", () => {
    const after = afterIntervalChange(changed("QUARTER", "2026-04-01", "Das neue Intervall gilt ab 1. April 2026."), today)
    expect(after.period).toEqual({type: "YQ", year: 2026, segment: 2})
    expect(after.message).toBe("Abrechnungszeitraum geändert. Das neue Intervall gilt ab 1. April 2026. "
      + "Als Nächstes abzurechnen: 2. Quartal 2026.")
  })

  it("does not call today's period the next one when there is no final billing yet", () => {
    const after = afterIntervalChange(changed("QUARTER", null,
      "Das neue Intervall gilt sofort, es gibt noch keine endgültige Abrechnung."), today)
    expect(after.period).toEqual({type: "YQ", year: 2026, segment: 4})
    expect(after.message).toBe("Abrechnungszeitraum geändert. Das neue Intervall gilt sofort, es gibt noch keine "
      + "endgültige Abrechnung.")
  })
})
