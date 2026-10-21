import {createSelector} from "@reduxjs/toolkit";

// import { EnergyState, adapter, featureKey } from '../states';
import {adapter, featureKey, BillingState} from "../states";
import {ParticipantBillType} from "../../../models/meteringpoint.model";

const { selectById, selectAll } = adapter.getSelectors();

const featureStateSelector = (state: { [featureKey]: BillingState }) => state[featureKey];

export const billingSelector = createSelector(
  featureStateSelector,
  selectAll
);

export const selectBillFetchingSelector = createSelector(
    featureStateSelector, billingState => billingState.isFetching
);

export const selectBillPollingSelector = createSelector(
    featureStateSelector, billingState => billingState.isPolling
);

export const selectBillById = (id: string | undefined) =>
  createSelector(
    featureStateSelector,
    (billingState: BillingState): ParticipantBillType | undefined => {
      return id ? (selectById(billingState, id) || undefined) : undefined;
    }
  );

export const selectBillByMeter = (id: string, meter: string) => createSelector(
  selectBillById(id),
  (entries) => {
    if (entries) {
      const meters = entries!.meteringPoints.filter(m => m.id === meter)
      if (meters.length > 0) {
        return meters[0].amount
      }
    }
    return 0
  }
)

export const selectBillByParticipant = (id: string) => createSelector(
  selectBillById(id),
  entries => entries?.amount
)