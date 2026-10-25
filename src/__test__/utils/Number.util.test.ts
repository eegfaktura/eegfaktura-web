import { describe, it, expect } from "vitest";
import {formatDecimal2, parseDecimal} from "../../util/Number.util";

describe("parseDecimal", () => {
  it("reads German notation with thousand separators", () => {
    expect(parseDecimal("1.234,56")).toBe(1234.56)
    expect(parseDecimal("1.234.567,8")).toBe(1234567.8)
  })

  it("reads a decimal comma", () => {
    expect(parseDecimal("1,5")).toBe(1.5)
    expect(parseDecimal("0,25")).toBe(0.25)
  })

  it("keeps dot-only and plain input as before", () => {
    expect(parseDecimal("1.5")).toBe(1.5)
    expect(parseDecimal("12")).toBe(12)
    expect(parseDecimal(" 7 ")).toBe(7)
  })

  it("returns NaN for no number", () => {
    expect(parseDecimal("abc")).toBeNaN()
  })
})

describe("formatDecimal2", () => {
  it("uses a decimal comma and two decimals", () => {
    expect(formatDecimal2(12.345)).toBe("12,35")
    expect(formatDecimal2(0.5)).toBe("0,50")
    expect(formatDecimal2(3)).toBe("3,00")
  })

  it("never shows a negative zero", () => {
    expect(formatDecimal2(-0)).toBe("0,00")
  })
})
