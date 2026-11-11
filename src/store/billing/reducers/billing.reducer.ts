import {createReducer} from "@reduxjs/toolkit";
import {adapter, initialState} from "../states";
import {
  fetchEnergyBills,
  fetchParticipantAmounts,
  resetParticipantAmounts,
  resumeEnergyBillsPolling,
  BILLING_POLL_STOPPED
} from "../actions";

export const reducer = createReducer(initialState, builder =>
  builder
    .addCase(fetchEnergyBills.pending, state => {
      return {...state, isFetching: true, isPolling: true};
    })
    .addCase(fetchEnergyBills.fulfilled, (state, action) => {
      const {billing} = action.payload
      return adapter.setAll({...state, isFetching: false, isPolling: false}, billing.participantAmounts)
    })
    .addCase(fetchEnergyBills.rejected, (state, action) => {
      // a poller replaced by a newer one for the same run (261024-ca13): the newer one still polls
      if (action.payload === BILLING_POLL_STOPPED) return state
      return {...state, isFetching: false, isPolling: false};
    })
    .addCase(resumeEnergyBillsPolling.pending, state => {
      return {...state, isFetching: true, isPolling: true};
    })
    .addCase(resumeEnergyBillsPolling.fulfilled, (state, action) => {
      const {billing} = action.payload
      return adapter.setAll({...state, isFetching: false, isPolling: false}, billing.participantAmounts)
    })
    .addCase(resumeEnergyBillsPolling.rejected, (state, action) => {
      // a poller replaced by a newer one for the same run (261024-ca13): the newer one still polls
      if (action.payload === BILLING_POLL_STOPPED) return state
      return {...state, isFetching: false, isPolling: false};
    })
    .addCase(fetchParticipantAmounts.pending, state => {
      return {...state, isFetching: true};
    })
    .addCase(fetchParticipantAmounts.fulfilled, (state, action) => {
      const {participantAmounts} = action.payload
      return adapter.setAll({...state, isFetching: false}, participantAmounts)
    })
    .addCase(fetchParticipantAmounts.rejected, state => {
      return {...state, isFetching: false};
    })
    .addCase(resetParticipantAmounts, state => {
      return {...initialState, isPolling: state.isPolling};
    })
);
