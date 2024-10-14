import { describe, it, expect } from "vitest";
import {calc, determinePeriodEnd, getPeriodSegment, splitDate} from "../../util/Helper.util";

describe("Helpers", () => {
  it("split date (dd.mm.yyyy HH:MM:SS", async () => {
    const numbers = splitDate("04.01.2024 00:00:00")
    expect(numbers).toEqual([4,1,2024,0,0,0])
  });

  it("calc date", async () => {
    const numbers2024 = splitDate("01.01.2024 00:00:00")
    const numbers2024_1 = splitDate("04.01.2024 00:00:00")
    const numbers2023 = splitDate("31.12.2023 00:00:00")

    const sum2024 = calc(numbers2024)
    const sum2024_1 = calc(numbers2024_1)
    const sum2023 = calc(numbers2023)

    expect(sum2023).toBeLessThan(sum2024)
    expect(sum2024).toBeGreaterThan(sum2023)
    expect(sum2024).toBeLessThan(sum2024_1)
    expect(sum2024_1).toBeGreaterThan(sum2024)
    expect(sum2023+1).toBe(sum2024)
  });

  it("generate Peroidsegment", async () => {
    const segment = getPeriodSegment("Y", 0)
    expect(segment).toBe(0)
    expect(getPeriodSegment("Y", 11)).toBe(0)
    expect(getPeriodSegment("YM", 13)).toBe(12)
    expect(getPeriodSegment("YM", 0)).toBe(1)
    expect(getPeriodSegment("YM", 11)).toBe(11)
    expect(getPeriodSegment("YQ", -1)).toBe(1)
    expect(getPeriodSegment("YQ", 14)).toBe(4)
    expect(getPeriodSegment("YQ", 7)).toBe(3)
    expect(getPeriodSegment("YQ", 11)).toBe(4)
    expect(getPeriodSegment("YH", 13)).toBe(2)
    expect(getPeriodSegment("YH", 11)).toBe(2)
    expect(getPeriodSegment("YH", 7)).toBe(2)
    expect(getPeriodSegment("YH", 0)).toBe(1)
    expect(getPeriodSegment("YH", 6)).toBe(1)
  });

  it("determine last date of a peroid", async () => {
    expect(determinePeriodEnd({type: "YH", segment: 1, year: 2023})).toEqual([6, 2023])
    expect(determinePeriodEnd({type: "YH", segment: 2, year: 2023})).toEqual([12, 2023])
    expect(determinePeriodEnd({type: "YQ", segment: 1, year: 2023})).toEqual([3, 2023])
    expect(determinePeriodEnd({type: "YQ", segment: 2, year: 2023})).toEqual([6, 2023])
    expect(determinePeriodEnd({type: "YQ", segment: 3, year: 2023})).toEqual([9, 2023])
    expect(determinePeriodEnd({type: "YQ", segment: 4, year: 2023})).toEqual([12, 2023])
    expect(determinePeriodEnd({type: "YM", segment: 4, year: 2023})).toEqual([4, 2023])
    expect(determinePeriodEnd({type: "Y", segment: 0, year: 2023})).toEqual([12, 2023])
  })

})