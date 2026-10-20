import {createEntityAdapter, EntityState} from "@reduxjs/toolkit";
import {EegTariff} from "../../../models/eeg.model";

export const featureKey = 'rate';

export interface RateState extends EntityState<EegTariff, string> {
  isFetching: boolean;
  selectedRate: EegTariff | undefined;
  // true once the tariffs of the current tenant are loaded or failed to load; the energy report waits for it, so
  // time-based tariffs (ZVT) are known for its first request (platform#174)
  loaded: boolean;
}
export const adapter = createEntityAdapter<EegTariff>();

// export const adapter = createEntityAdapter<EegRate>({
//   selectId: (rate) => rate.id
// });

export const initialState: RateState = adapter.getInitialState({
  isFetching: false,
  selectedRate: undefined,
  loaded: false,
});