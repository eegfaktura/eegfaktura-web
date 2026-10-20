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

export const ratesSelector = createSelector(
  featureStateSelector,
  selectAll
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