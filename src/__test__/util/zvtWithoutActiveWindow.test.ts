import {describe, expect, it} from "vitest";
import {zvtWithoutActiveWindow} from "../../util/Helper.util";
import {EegTariff} from "../../models/eeg.model";

const tariff = (t: Partial<EegTariff>) => ({type: "VZP", ...t}) as Partial<EegTariff>

describe("zvtWithoutActiveWindow (platform#175)", () => {
  it("flags a time-based tariff without an active window, also when window values are filled in", () => {
    expect(zvtWithoutActiveWindow(tariff({useTimeTariff: true}))).toBe(true)
    expect(zvtWithoutActiveWindow(tariff({
      useTimeTariff: true, timeTariff1Active: false, timeTariff1From: "06:00", timeTariff1To: "08:00",
    }))).toBe(true)
  })

  it("flags an active window without From/To: web would bill it as a simple tariff", () => {
    expect(zvtWithoutActiveWindow(tariff({useTimeTariff: true, timeTariff1Active: true, timeTariff1From: "06:00"})))
      .toBe(true)
  })

  it("accepts a time-based tariff with one complete active window", () => {
    expect(zvtWithoutActiveWindow(tariff({
      useTimeTariff: true, timeTariff1Active: true, timeTariff1From: "06:00", timeTariff1To: "08:00",
    }))).toBe(false)
    expect(zvtWithoutActiveWindow(tariff({
      type: "EZP", useTimeTariff: true, timeTariff2Active: true, timeTariff2From: "22:00", timeTariff2To: "06:00",
    }))).toBe(false)
  })

  it("ignores simple tariffs and member (EEG) tariffs, which have no time windows", () => {
    expect(zvtWithoutActiveWindow(tariff({useTimeTariff: false}))).toBe(false)
    expect(zvtWithoutActiveWindow(tariff({type: "EEG", useTimeTariff: true}))).toBe(false)
    expect(zvtWithoutActiveWindow(undefined)).toBe(false)
  })
})
