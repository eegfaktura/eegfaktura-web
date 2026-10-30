import {describe, expect, it} from "vitest";
import {formatCent, formatDecimal2, formatKwh, formatNumber, formatTariffEuro, parseDecimal} from "../../util/Number.util";
import {DATE_PICKER_FORMAT, formatDate, formatDateTime, MONTH_NAMES} from "../../util/DateFormat.util";

// platform#228 step 1: one German notation for numbers and dates on screen.

describe("number notation: decimal comma, thousands dot", () => {
  it("kWh with three decimals - the dashboard no longer shows 185.337 kWh for 185,337 kWh", () => {
    expect(formatKwh(185.337)).toBe("185,337 kWh")
    expect(formatKwh(185337)).toBe("185.337,000 kWh")
    expect(formatKwh(1234567.8915)).toBe("1.234.567,892 kWh")
  })

  it("groups with a plain dot, never with a (no-break) space as de-AT does in current CLDR", () => {
    expect(formatDecimal2(1234.5)).toBe("1.234,50")
    expect(formatNumber(1234567)).toBe("1.234.567")
    expect(formatDecimal2(1234.5)).not.toMatch(/[\s  ]/)
  })

  it("reads back with the amount parser of the input fields (261005-ca5)", () => {
    expect(parseDecimal(formatDecimal2(1234.56))).toBe(1234.56)
    expect(parseDecimal(formatNumber(1234567.125, 3))).toBe(1234567.125)
  })

  it("shows no minus zero", () => {
    expect(formatDecimal2(-0)).toBe("0,00")
  })

  it("tariff prices keep their decimals, euro values get at least two", () => {
    expect(formatCent(12.5)).toBe("12,5 Cent")
    expect(formatCent(10)).toBe("10 Cent")
    expect(formatTariffEuro(1.5)).toBe("1,50 €")
    expect(formatTariffEuro(0.125)).toBe("0,125 €")
    expect(formatTariffEuro(1234)).toBe("1.234,00 €")
  })

  it("reads tariff values that arrive as text", () => {
    expect(formatNumber("2.5", 0, 6)).toBe("2,5")
    expect(formatNumber("2,5", 0, 6)).toBe("2,5")
    expect(formatNumber("20", 0, 6)).toBe("20")
  })
})

describe("date notation", () => {
  it("formats dates as DD.MM.YYYY and date-times as DD.MM.YYYY HH:mm", () => {
    expect(formatDate(new Date(2026, 9, 28, 14, 5))).toBe("28.10.2026")
    expect(formatDateTime(new Date(2026, 9, 28, 14, 5))).toBe("28.10.2026 14:05")
    expect(formatDate("2026-10-28")).toBe("28.10.2026")
    expect(formatDate(new Date(2026, 0, 2).getTime())).toBe("02.01.2026")
  })

  it("date pickers use the same notation and Austrian month names", () => {
    expect(DATE_PICKER_FORMAT).toBe("dd.MM.yyyy")
    expect(MONTH_NAMES).toHaveLength(12)
    expect(MONTH_NAMES[0]).toBe("Jänner")
    expect(MONTH_NAMES[9]).toBe("Oktober")
  })
})
