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
    expect(zvtWindowsKey({})).toBe(zvtWindowsKey({s: simple}))
  })

  it("changes when a tariff becomes time-based (platform: ZVT buckets missing after the switch)", () => {
    expect(zvtWindowsKey({s: simple, z: {...timed("11:00", "14:00"), useTimeTariff: false} as EegTariff}))
      .not.toBe(zvtWindowsKey({s: simple, z: timed("11:00", "14:00")}))
  })

  it("changes when a window changes, not when only other fields change", () => {
    const a = zvtWindowsKey({z: timed("11:00", "14:00")})
    expect(zvtWindowsKey({z: timed("11:00", "15:00")})).not.toBe(a)
    expect(zvtWindowsKey({z: {...timed("11:00", "14:00"), name: "neu"} as EegTariff})).toBe(a)
  })
})
