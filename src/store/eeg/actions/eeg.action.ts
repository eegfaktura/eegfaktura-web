import {createAction, createAsyncThunk} from "@reduxjs/toolkit";
import {ErrorState, featureKey} from "../states/eeg.state";
import {Api} from "../../../service";
import {Eeg} from "../../../models/eeg.model";

export const fetchEegModel = createAsyncThunk(
  `${featureKey}/fetchEeg`,
  async (arg: { token?: string, tenant: string }) => {
    const { token, tenant } = arg;
    const result = await Api.eegService.fetchEeg(tenant, token);
    return { eeg: result };
  }
)

export const updateEegModel = createAsyncThunk(
  `${featureKey}/updateEeg`,
  async (arg: { tenant: string, eeg: Record<string, any> }) => {
    const { tenant, eeg } = arg;
    const result = await Api.eegService.updateEeg(tenant, eeg);
    return { tenant: tenant, eeg: result};
  }
)

export const selectTenant = createAction<string>(`${featureKey}/selectTenant`);

// the EEG as the backend returned it after a change made elsewhere (interval change, platform#230)
export const eegChanged = createAction<{ tenant: string, eeg: Eeg }>(`${featureKey}/eegChanged`);

export const setErrorState = createAction<ErrorState>(`${featureKey}/setErrorState`)
export const clearErrorState = createAction<void>(`${featureKey}/clearErrorState`)