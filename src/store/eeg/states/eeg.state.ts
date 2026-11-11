import {Eeg} from "../../../models/eeg.model";
import {createEntityAdapter, EntityState} from "@reduxjs/toolkit";


export const featureKey = 'eeg';

export interface ErrorState {
  message: string,
}

export interface EegState extends EntityState<Eeg, string> {
  isFetching: boolean;
  selectedTenant: string | null;
  error?: ErrorState
  hasError: boolean
  // text of the failed EEG load, shown on the pages with "Erneut versuchen"; cleared by the next load (261024-ca11)
  loadError?: string
}

export const adapter = createEntityAdapter<Eeg, string>({
  selectId: (eeg) => eeg.id
});
// export const adapter = createEntityAdapter<Eeg>();

export const initialState: EegState = adapter.getInitialState({
  isFetching: false,
  selectedTenant: localStorage.getItem("tenant"),
  hasError: false,
});