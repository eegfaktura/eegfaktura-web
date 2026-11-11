import {Metering} from "../../models/meteringpoint.model";
import {EegTariff} from "../../models/eeg.model";

export type TradedSummary = {
  taken: number          // "Verkauft": the community sells to its consumers (their self-coverage, G.03)
  spent: number          // "Eingekauft": the community buys from its producers (production − surplus)
  withoutTariff: number  // metering points with energy but without a valid tariff of the community: not counted above
  withoutTariffKwh: number
}

// "Energiemengen" of the overview card. Only metering points with a tariff of the community count (they are what
// gets billed). Those with energy but no valid tariff (none, or an archived one) are counted once per metering point
// with their energy, so the card can say what "Eingekauft" and "Verkauft" leave out. Metering points without energy
// (e.g. registered, not active yet) and values not loaded yet are not counted.
export const tradedSummary = (meters: { meter: Metering, utilization: number | undefined }[],
                              rates: Record<string, EegTariff>): TradedSummary => {
  const missing = new Map<string, number>()
  const s = meters.reduce((s, m, i) => {
    if (!rates[m.meter.tariff_id]) {
      if (m.utilization !== undefined && !isNaN(m.utilization) && m.utilization !== 0) {
        missing.set(m.meter.meteringPoint, (missing.get(m.meter.meteringPoint) ?? 0) + m.utilization)
      }
      return s
    }
    if (m.utilization === undefined || isNaN(m.utilization)) {
      console.error("Meter has invalid energy values!", i, m)
      return s
    }
    return m.meter.direction === "CONSUMPTION"
      ? {...s, taken: s.taken + m.utilization}
      : {...s, spent: s.spent + m.utilization}
  }, {taken: 0, spent: 0})
  return {...s, withoutTariff: missing.size, withoutTariffKwh: [...missing.values()].reduce((a, b) => a + b, 0)}
}
