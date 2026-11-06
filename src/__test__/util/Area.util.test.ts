import {describe, expect, it} from "vitest";
import {areaLabel, hasBilling, hasMultipleGridOperators, zoneLevelLabel} from "../../util/Area.util";
import i18next from "../../util/I18n";

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

  // addendum 05.11.2026: P2P and EVA run like a BEG
  it("may have several grid operators for BEG, P2P and EVA", () => {
    expect(["BEG", "P2P", "EVA"].every(a => hasMultipleGridOperators(a))).toBe(true)
    expect(["LOCAL", "REGIONAL", "GEA", undefined].some(a => hasMultipleGridOperators(a))).toBe(false)
  })

  it("names the zone levels 1–7 from the locales, anything else is unknown", () => {
    const t = i18next.getFixedT("de", "common")
    const label = (level?: number | null) => zoneLevelLabel(t, level)
    expect([1, 2, 3, 4, 5, 6, 7].map(label)).toEqual(["1 Hauptleitung", "2 Standortbereich", "3 Lokalbereich",
      "4 Regionalbereich: ein Netzgebiet", "5 Regionalbereich: mehrere Netzgebiete", "6 Keine Verbindung: ein Netzgebiet",
      "7 Keine Verbindung: mehrere Netzgebiete"])
    expect([null, undefined, 0, 8, 2.5].map(label)).toEqual(Array(5).fill("unbekannt"))
    expect(zoneLevelLabel(i18next.getFixedT("en", "common"), 3)).toBe("3 Local area")
  })
})
