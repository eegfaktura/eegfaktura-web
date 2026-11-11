import {describe, expect, it} from "vitest";
import {areaLabel, hasMultipleGridOperators, isPreviewOnly, zoneLevelLabel} from "../../util/Area.util";
import i18next from "../../util/I18n";

describe("community type (platform#229)", () => {
  it("shows the short forms of admin with the long form in brackets", () => {
    expect(["LOCAL", "REGIONAL", "GEA", "BEG", "P2P", "EVA"].map(a => areaLabel(a)))
      .toEqual(["EEG lokal (Erneuerbare-Energie-Gemeinschaft, lokal)",
        "EEG regional (Erneuerbare-Energie-Gemeinschaft, regional)", "GEA (Gemeinschaftliche Erzeugungsanlage)",
        "BEG (Bürgerenergiegemeinschaft)", "P2P (Peer-to-Peer)", "EVA (Eigenversorgungsanlage)"])
  })

  it("shows unknown or missing values as they are", () => {
    expect(areaLabel("PP")).toBe("PP")
    expect(areaLabel("toString")).toBe("toString")
    expect(areaLabel(undefined)).toBeUndefined()
  })

  it("bills a preview only for peer-to-peer and self-supply (platform#255)", () => {
    expect(isPreviewOnly("P2P")).toBe(true)
    expect(isPreviewOnly("EVA")).toBe(true)
    expect(["LOCAL", "REGIONAL", "GEA", "BEG", undefined].some(a => isPreviewOnly(a))).toBe(false)
  })

  it("may have several grid operators for BEG, P2P and EVA", () => {
    expect(["BEG", "P2P", "EVA"].every(a => hasMultipleGridOperators(a))).toBe(true)
    expect(["LOCAL", "REGIONAL", "GEA", undefined].some(a => hasMultipleGridOperators(a))).toBe(false)
  })

  it("names the zone levels 1–7 from the locales, anything else is unknown", () => {
    const t = i18next.getFixedT("de", "common")
    const label = (level?: number | null) => zoneLevelLabel(t, level)
    // official names of the ElWG zone levels (Harald, 07.11.2026)
    expect([1, 2, 3, 4, 5, 6, 7].map(label)).toEqual(["1 (Haupt-/Steigleitung)",
      "2 (Standortbereich – gemeinsame Sammelschiene)", "3 (Lokalbereich – gleiche Trafostation)",
      "4 (Regionalbereich – gleiches Umspannwerk eines Netzbetreibers)",
      "5 (Regionalbereich – gleiches Umspannwerk verschiedener Netzbetreiber)",
      "6 (Gebotszone – mehrere Umspannwerke eines Netzbetreibers)",
      "7 (Gebotszone – mehrere Umspannwerke verschiedener Netzbetreiber)"])
    expect([null, undefined, 0, 8, 2.5].map(label)).toEqual(Array(5).fill("unbekannt"))
    expect(zoneLevelLabel(i18next.getFixedT("en", "common"), 3)).toBe("3 (Local area – same transformer station)")
  })
})
