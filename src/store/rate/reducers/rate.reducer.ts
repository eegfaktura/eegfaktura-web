import {createReducer} from "@reduxjs/toolkit";
import {archiveRate, fetchRatesModel, saveNewRate, selectRate, updateRate} from "../actions/rate.action";
import {adapter, initialState} from "../states";

export const reducer = createReducer(initialState, builder =>
  builder
    .addCase(fetchRatesModel.pending, (state) => {
      return {...state, loaded: false}
    })
    .addCase(fetchRatesModel.fulfilled, (state, action) => {
      const {rates} = action.payload
      return adapter.setAll({...state, selectedRate: undefined, loaded: true}, rates)
    })
    .addCase(fetchRatesModel.rejected, (state) => {
      return {...state, loaded: true}
    })
    .addCase(saveNewRate.fulfilled, (state, action) => {
      return adapter.addOne({...state, selectedRate: action.payload}, action.payload)
    })
    .addCase(updateRate.fulfilled, (state, action) => {
      return adapter.updateOne({...state, selectedRate: action.payload}, {id: action.payload.id, changes: action.payload})
    })
    .addCase(selectRate, (state, action) => {
      return {...state, selectedRate: action.payload}
    })
    .addCase(archiveRate.fulfilled, (state, action) => {
      return adapter.removeOne({...state, selectedRate: undefined}, action.payload)
    })
);
