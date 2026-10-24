import {createSelector} from "@reduxjs/toolkit";

import { EegState, adapter, featureKey } from '../states';
import {Eeg} from "../../../models/eeg.model";

const { selectAll, selectById, selectEntities } = adapter.getSelectors();

const featureStateSelector = (state: { [featureKey]: EegState }) => state[featureKey];

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

export const eegSelector = createSelector(
  featureStateSelector,
  (eegState: EegState): Eeg | undefined => {
    return selectById(eegState, (eegState.selectedTenant || "")) || undefined;
  }
)


export const selectEegById = (id: string) =>
  createSelector(
    featureStateSelector,
    (eegState: EegState): Eeg | undefined => {
      return selectById(eegState, id) || undefined;
    }
  );

export const selectedTenant = createSelector(
  featureStateSelector,
  state => state.selectedTenant || ""
)

export const activeTenant = createSelector(
  featureStateSelector,
  eegSelector,
  (state, eeg) => eeg ? {ecId: eeg.communityId, tenant: state.selectedTenant!} : undefined
)

export const eegLoadErrorSelector = createSelector(
  featureStateSelector,
  state => state.loadError
)

export const selectError = createSelector(
  featureStateSelector,
  state => {return {hasError: state.hasError, error: state.error}}
)