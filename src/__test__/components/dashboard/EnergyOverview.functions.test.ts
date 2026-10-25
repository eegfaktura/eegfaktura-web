import {describe, expect, it} from "vitest";
import {tradedSummary} from "../../../components/dashboard/EnergyOverview.functions";

// "Eingekauft"/"Verkauft" count metering points with a tariff of the community only; those with energy but no valid
// tariff are counted once with their energy, so the card can say what is left out (pilot 25.10.2026: a consumer
// without tariff, ~224 kWh missing in "Verkauft").

const rates = {t1: {} as any, t2: {} as any}
const m = (meteringPoint: string, direction: string, tariff_id: string, utilization: number | undefined) =>
  ({meter: {meteringPoint, direction, tariff_id} as any, utilization})

describe("tradedSummary", () => {
  it("sums consumers into 'Verkauft' and producers into 'Eingekauft'; reports metering points without valid tariff", () => {
    const s = tradedSummary([
      m("AT1", "CONSUMPTION", "t1", 100), m("AT2", "CONSUMPTION", "t1", 50),
      m("AT3", "CONSUMPTION", "", 224.4),              // no tariff
      m("AT4", "GENERATION", "t2", 374.4),
      m("AT5", "CONSUMPTION", "archived", 3),          // tariff not (any more) of this community
    ], rates)
    expect(s).toEqual({taken: 150, spent: 374.4, withoutTariff: 2, withoutTariffKwh: 227.4})
  })

  it("does not report metering points without energy (registered, not active yet) or not loaded yet", () => {
    const s = tradedSummary([m("AT1", "CONSUMPTION", "", 0), m("AT2", "CONSUMPTION", "", undefined),
      m("AT3", "CONSUMPTION", "t1", undefined)], rates)
    expect(s).toEqual({taken: 0, spent: 0, withoutTariff: 0, withoutTariffKwh: 0})
  })

  it("counts a metering point with two participations (owner change) once", () => {
    const s = tradedSummary([m("AT1", "CONSUMPTION", "", 10), m("AT1", "CONSUMPTION", "", 5)], rates)
    expect(s).toEqual({taken: 0, spent: 0, withoutTariff: 1, withoutTariffKwh: 15})
  })
})
