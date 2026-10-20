import {describe, expect, it} from "vitest";
import {zvtWithoutActiveWindow} from "../../util/Helper.util";

describe("zvtWithoutActiveWindow (platform#175)", () => {
  it("flags a time-based tariff without an active window, also when window values are filled in", () => {
    expect(zvtWithoutActiveWindow({useTimeTariff: true})).toBe(true)
    expect(zvtWithoutActiveWindow({
      useTimeTariff: true, timeTariff1Active: false, timeTariff1From: "06:00", timeTariff1To: "08:00",
    })).toBe(true)
  })

  it("accepts a time-based tariff with one active window", () => {
    expect(zvtWithoutActiveWindow({useTimeTariff: true, timeTariff1Active: true})).toBe(false)
    expect(zvtWithoutActiveWindow({useTimeTariff: true, timeTariff2Active: true})).toBe(false)
  })

  it("ignores simple tariffs", () => {
    expect(zvtWithoutActiveWindow({useTimeTariff: false})).toBe(false)
    expect(zvtWithoutActiveWindow(undefined)).toBe(false)
  })
})
