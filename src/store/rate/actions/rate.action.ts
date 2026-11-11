import {createAction, createAsyncThunk} from "@reduxjs/toolkit";
import {featureKey} from "../states/rate.state";
import {EegTariff} from "../../../models/eeg.model";
import {Api} from "../../../service";

export const fetchRatesModel = createAsyncThunk(
  `${featureKey}/fetch`,
  async (arg: { token?: string, tenant: string }) => {
    const { token, tenant } = arg;
    const result = await Api.eegService.fetchRates(tenant, token);
    return { rates: result };
  }
)

export const saveNewRate = createAsyncThunk(
  `${featureKey}/save`,
  async (arg: { rate: EegTariff, tenant: string }) => {
    const {rate, tenant} = arg
    const result = await Api.eegService.addRate(tenant, rate);
    return result;
  }
)

export const updateRate = createAsyncThunk(
  `${featureKey}/update`,
  async (arg: {rate: EegTariff, tenant: string}) => {
    
      const {rate, tenant} = arg
      const result = await Api.eegService.addRate(tenant, rate);
      return result;
  }
)

export const archiveRate = createAsyncThunk(
  `${featureKey}/archive`,
  async (arg: {rate: EegTariff, tenant: string}, { rejectWithValue }) => {
    const {rate, tenant} = arg
    try {
      await Api.tariffService.archiveTariff(tenant, rate.id);
      return rate.id
    } catch (e) {
      return rejectWithValue(e)
    }
  }
)

export const selectRate = createAction<EegTariff | undefined>(`${featureKey}/select/rate`);
// no tariffs until the community's tariffs are loaded (platform#229: they load after its EEG now)
export const clearRates = createAction(`${featureKey}/clear`);
