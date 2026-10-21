import {describe, expect, it} from "vitest";
import {zvtWindowsKey} from "../../util/Helper.util";
import {EegTariff} from "../../models/eeg.model";

const simple = {id: "s", type: "EZP", useTimeTariff: false} as unknown as EegTariff
const timed = (from: string, to: string) => ({
  id: "z", type: "EZP", useTimeTariff: true,
  timeTariff1Active: true, timeTariff1From: from, timeTariff1To: to,
} as unknown as EegTariff)

describe("zvtWindowsKey", () => {
  it("is the same without time-based tariffs, also before the tariffs are loaded", () => {
    expect(zvtWindowsKey({}, ["s"])).toBe(zvtWindowsKey({s: simple}, ["s"]))
  })

  it("changes when a used tariff becomes time-based (platform#174)", () => {
    expect(zvtWindowsKey({s: simple, z: {...timed("11:00", "14:00"), useTimeTariff: false} as EegTariff}, ["s", "z"]))
      .not.toBe(zvtWindowsKey({s: simple, z: timed("11:00", "14:00")}, ["s", "z"]))
  })

  it("changes when a window changes, not when only other fields change", () => {
    const a = zvtWindowsKey({z: timed("11:00", "14:00")}, ["z"])
    expect(zvtWindowsKey({z: timed("11:00", "15:00")}, ["z"])).not.toBe(a)
    expect(zvtWindowsKey({z: {...timed("11:00", "14:00"), name: "neu"} as EegTariff}, ["z"])).toBe(a)
  })

  it("ignores time-based tariffs no metering point uses", () => {
    expect(zvtWindowsKey({s: simple, z: timed("11:00", "14:00")}, ["s"])).toBe(zvtWindowsKey({s: simple}, ["s"]))
  })
})
