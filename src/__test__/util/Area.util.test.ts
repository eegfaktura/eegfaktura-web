import {describe, expect, it} from "vitest";
import {areaLabel, hasBilling} from "../../util/Area.util";

describe("community type (platform#229)", () => {
  it("shows the short forms of admin", () => {
    expect(["LOCAL", "REGIONAL", "GEA", "BEG", "P2P", "EVA"].map(a => areaLabel(a)))
      .toEqual(["EEG lokal", "EEG regional", "GEA", "BEG", "P2P", "EVA"])
  })

  it("shows unknown or missing values as they are", () => {
    expect(areaLabel("PP")).toBe("PP")
    expect(areaLabel("toString")).toBe("toString")
    expect(areaLabel(undefined)).toBeUndefined()
  })

  it("has no billing for peer-to-peer and self-supply only", () => {
    expect(hasBilling("P2P")).toBe(false)
    expect(hasBilling("EVA")).toBe(false)
    expect(["LOCAL", "REGIONAL", "GEA", "BEG"].every(a => hasBilling(a))).toBe(true)
  })

  it("keeps billing while the community is not loaded", () => {
    expect(hasBilling(undefined)).toBe(true)
  })
})
