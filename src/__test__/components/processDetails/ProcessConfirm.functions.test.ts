import {describe, expect, it} from "vitest";
import {
  meterList,
  partFactSummary,
  requestValuesSummary,
  revokeSummary
} from "../../../components/processDetails/ProcessConfirm.functions";
import {Metering} from "../../../models/meteringpoint.model";

const meter = (n: number, partFact = 100) => ({meteringPoint: `AT00${n}`, partFact} as unknown as Metering)

describe("summaries before an EDA process (platform#228 step 3)", () => {
  it("lists up to five metering points and counts the rest", () => {
    expect(meterList(["A", "B"])).toBe("A, B")
    expect(meterList(["A", "B", "C", "D", "E", "F", "G"])).toBe("A, B, C, D, E und 2 weitere")
  })

  it("names the old and new factor of each metering point", () => {
    expect(partFactSummary([meter(1, 100), meter(2, 50)], 40)).toBe("Teilnahmefaktor für 2 Zählpunkte auf 40 % ändern? "
      + "Die Änderung geht an den Netzbetreiber. (AT001: bisher 100 %, AT002: bisher 50 %)")
  })

  it("names the period and the metering points of an energy data request", () => {
    const start = new Date(2026, 0, 1), end = new Date(2026, 0, 31)
    expect(requestValuesSummary([meter(1), meter(2)], start, end, false))
      .toBe("Energiedaten für 2 Zählpunkte (AT001, AT002) für 01.01.2026 – 31.01.2026 beim Netzbetreiber anfordern?")
    const all = Array.from({length: 2380}, (_, i) => meter(i))
    expect(requestValuesSummary(all, start, end, true))
      .toBe("Energiedaten für die ganze Gemeinschaft (2.380 Zählpunkte) für 01.01.2026 – 31.01.2026 beim Netzbetreiber anfordern?")
  })

  it("names the end of the data consent", () => {
    expect(revokeSummary([meter(1), meter(2)], new Date(2026, 10, 30))).toBe("Soll die Datenfreigabe für 2 Zählpunkte "
      + "(AT001, AT002) beim Netzbetreiber aufgehoben werden? Ende der Datenfreigabe: 30.11.2026.")
  })
})
