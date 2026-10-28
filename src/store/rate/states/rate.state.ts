import {createEntityAdapter, EntityState} from "@reduxjs/toolkit";
import {EegTariff} from "../../../models/eeg.model";

export const featureKey = 'rate';

export interface RateState extends EntityState<EegTariff, string> {
  isFetching: boolean;
  selectedRate: EegTariff | undefined;
}
// tariffs in a fixed order (pilot group 2026-10-28): by kind as in the tariff form (Mitglied, Erzeuger, Verbraucher),
// then by name with numbers in natural order („Beitritt 2 ZP“ before „Beitritt 10 ZP“), then by id for equal names.
// Sorted in the adapter, so every tariff list gets it and the selectors stay memoized.
export const TARIFF_TYPE_ORDER: EegTariff["type"][] = ["EEG", "EZP", "VZP"]
const typeRank = (t: EegTariff["type"]) => {
  const i = TARIFF_TYPE_ORDER.indexOf(t)
  return i < 0 ? TARIFF_TYPE_ORDER.length : i
}
export const compareTariffs = (a: EegTariff, b: EegTariff) =>
  typeRank(a.type) - typeRank(b.type)
  || (a.name ?? "").localeCompare(b.name ?? "", "de", {numeric: true, sensitivity: "base"})
  || (a.id ?? "").localeCompare(b.id ?? "")

export const adapter = createEntityAdapter<EegTariff>({sortComparer: compareTariffs});

// export const adapter = createEntityAdapter<EegRate>({
//   selectId: (rate) => rate.id
// });

export const initialState: RateState = adapter.getInitialState({
  isFetching: false,
  selectedRate: undefined,
});