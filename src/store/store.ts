
import * as eeg from './eeg';
import * as participant from './participant';
import * as rate from './rate';
import * as energy from './energy';
import * as billing from './billing';
import * as billingRun from './billingRun';
import * as billingConfig from './billingConfig';

import user from './user';

import {combineReducers, configureStore, createSelector, Middleware} from "@reduxjs/toolkit";
import {activeMetersSelector, updateParticipantPartial} from "./participant";
import {meteringEnergyGroup11} from "./energy";
import {Metering} from "../models/meteringpoint.model";
import {ErrorState, setErrorState} from "./eeg";
import i18next from '../util/I18n'
import {saveNewRate} from "./rate";
import {userApi} from "./user/userApi";

/**
 * Reducer
 */
export const reducer = combineReducers({
  [eeg.featureKey]: eeg.reducer,
  [participant.featureKey]: participant.reducer,
  [rate.featureKey]: rate.reducer,
  [energy.featureKey]: energy.reducer,
  [billing.featureKey]: billing.reducer,
  [billingRun.featureKey]: billingRun.reducer,
  [billingConfig.featureKey]: billingConfig.reducer,
  [userApi.reducerPath]: userApi.reducer,
  user,
});

const errorMiddleware: Middleware = store => next => action => {
  try {

    const result = next(action)

    if (updateParticipantPartial.rejected.match(action)) {
      store.dispatch(setErrorState({message: i18next.t(`${action.error.message}_participant_update`, { ns: 'error' })} as ErrorState))
    } else if(saveNewRate.rejected.match(action)) {
      store.dispatch(setErrorState({message: i18next.t(`${action.error.message}_tariff_create`, { ns: 'error' })} as ErrorState))
    }

    return result

  } catch (ex) {
    console.error(ex)
    throw ex
  }
}

/**
 * Store
 */
export const store = configureStore({
  reducer,
  // middleware,
  devTools: true,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(errorMiddleware)
      .concat(userApi.middleware),
});


export function setupStore(preloadedState?: any) {
  return configureStore({
    reducer: reducer,
    preloadedState
  })
}

/**
 * Types
 */
export type State = ReturnType<typeof reducer>;
export type AppStore = ReturnType<typeof setupStore>
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


export const activeMeterEnergyArray = createSelector(
  activeMetersSelector,
  meteringEnergyGroup11,
  (metering, report) => metering.map((m) => {
    return { meter: m, utilization: report[m.meteringPoint] }
  })
)

export const activeMeterEnergyGroup = createSelector(
  activeMetersSelector,
  meteringEnergyGroup11,
  (metering, report) => metering.reduce((out, m) => {
    return {...out, [m.meteringPoint]: {m: m, utilization: report[m.meteringPoint]}}
  }, {} as Record<string, {m: Metering, utilization: number}>)
)
