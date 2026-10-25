import {clearErrorState, fetchEegModel, selectTenant, setErrorState, updateEegModel} from "../actions/eeg.action";
import {createReducer} from "@reduxjs/toolkit";
import {adapter, ErrorState, initialState} from "../states/eeg.state";
import i18next from '../../../util/I18n'
import {saveNewRate} from "../../rate";
import {withReason} from "../../../service/error.text";

export const reducer = createReducer(initialState, builder =>
  builder
    .addCase(fetchEegModel.pending, state => {
      return { ...state, isFetching: true, loadError: undefined };
    })
    .addCase(fetchEegModel.fulfilled, (state, action) => {
      const { eeg } = action.payload;
      // return adapter.setOne({ ...state, isFetching: false }, eeg);
      return adapter.setOne({ ...state, isFetching: false, loadError: undefined }, eeg)
    })
    .addCase(fetchEegModel.rejected, (state, action) => {
      const message = i18next.t(`${action.error.message}_eeg_load`,
          { ns: 'error', defaultValue: withReason("Die EEG-Daten konnten nicht geladen werden.", action.error.message) })
      return adapter.removeAll({ ...state, eeg: undefined, isFetching: false, hasError: true, error: {message} as ErrorState,
        loadError: message })
    })
    .addCase(updateEegModel.fulfilled, (state, action) => {
      const { tenant, eeg } = action.payload;
      return adapter.updateOne(state, {id: tenant, changes: eeg})
    })
    .addCase(updateEegModel.rejected, (state, action) => {
      // a failed save is not a failed load: its own text, with the reason
      return { ...state, isFetching: false, hasError: true,
        error: {message: withReason("Die Änderung der EEG-Daten konnte nicht gespeichert werden.", action.error.message)} as ErrorState };
    })
    .addCase(selectTenant, (state, action) => {
      return { ...state, selectedTenant: action.payload }
    })
    .addCase(setErrorState, (state, action) => {
      return { ...state, hasError: true, error: action.payload}
    })
    .addCase(clearErrorState, (state, action) => {
      return { ...state, hasError: false, error: undefined}
    })
    .addCase(saveNewRate.rejected, (state, action) => {
      return { ...state, isFetching: false, hasError: true, error: {message: action.error.message} as ErrorState };
    })
);
