import {createSelector} from "@reduxjs/toolkit";

// import { EnergyState, adapter, featureKey } from '../states';
import {adapter, featureKey, RateState} from "../states";
import {EegTariff} from "../../../models/eeg.model";

const { selectAll, selectById, selectEntities } = adapter.getSelectors();

const featureStateSelector = (state: { [featureKey]: RateState }) => state[featureKey];

export const entitiesSelector = createSelector(
  featureStateSelector,
  selectEntities
);

export const isFetchingSelector = createSelector(
  featureStateSelector,
  state => state.isFetching
);

// export const rateSelector = createSelector(
//   featureStateSelector,
//   selectAll
// );

// tariffs in a fixed order (pilot group 2026-10-28): by kind as in the tariff form (Mitglied, Erzeuger, Verbraucher),
// then by name with numbers in natural order („Beitritt 2 ZP“ before „Beitritt 10 ZP“)
export const TARIFF_TYPE_ORDER: EegTariff["type"][] = ["EEG", "EZP", "VZP"]
const typeRank = (t: EegTariff["type"]) => {
  const i = TARIFF_TYPE_ORDER.indexOf(t)
  return i < 0 ? TARIFF_TYPE_ORDER.length : i
}
export const compareTariffs = (a: EegTariff, b: EegTariff) =>
  typeRank(a.type) - typeRank(b.type) || (a.name ?? "").localeCompare(b.name ?? "", "de", {numeric: true, sensitivity: "base"})

export const ratesSelector = createSelector(
  featureStateSelector,
  (state) => [...selectAll(state)].sort(compareTariffs)
)

export const ratesMapSelector = createSelector(
  ratesSelector,
  (rateState) => rateState.reduce((out, r) => { return {...out, [r.id]: r}}, {} as Record<string, EegTariff>)
)

export const selectRateById = (id: string) =>
  createSelector(
    featureStateSelector,
    (rateState: RateState): EegTariff | undefined => {
      return selectById(rateState, id) || undefined;
    }
  );

export const selectedRateSelector = createSelector(
  featureStateSelector,
  state => state.selectedRate
)