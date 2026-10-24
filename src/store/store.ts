
import * as eeg from './eeg';
import * as participant from './participant';
import * as rate from './rate';
import * as energy from './energy';
import * as billing from './billing';
import * as billingRun from './billingRun';
import * as billingConfig from './billingConfig';

import user from './user';

import {combineReducers, configureStore, createSelector, Middleware} from "@reduxjs/toolkit";
import {
  activeParticipantsSelector1, fetchParticipantModel, moveMeteringPoint, registerMeteringpoint, updateMeteringPoint,
  updateMeteringPointPartFact, updateParticipant, updateParticipantPartial
} from "./participant";
import {meteringEnergyGroup11} from "./energy";
import {Metering} from "../models/meteringpoint.model";
import {ErrorState, setErrorState} from "./eeg";
import i18next from '../util/I18n'
import {fetchRatesModel, saveNewRate} from "./rate";
import {userApi} from "./user/userApi";
import {participantApi} from "./participant/api";

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
  [participantApi.reducerPath]: participantApi.reducer,
  user,
});

// Thunks whose failure no caller shows: report them through the global error toast (Eeg.provider).
// Thunks with their own error handling in the component (confirm, delete, create member) are not listed.
const silentFailures: [{ match: (a: any) => boolean }, string][] = [
  [fetchParticipantModel.rejected, "Die Mitglieder konnten nicht geladen werden."],
  [fetchRatesModel.rejected, "Die Tarife konnten nicht geladen werden."],
  [updateParticipant.rejected, "Das Mitglied konnte nicht gespeichert werden."],
  [updateMeteringPoint.rejected, "Der Zählpunkt konnte nicht gespeichert werden."],
  [updateMeteringPointPartFact.rejected, "Der Teilnahmefaktor konnte nicht gespeichert werden."],
  [moveMeteringPoint.rejected, "Der Zählpunkt konnte nicht verschoben werden."],
  [registerMeteringpoint.rejected, "Der Zählpunkt konnte nicht angelegt werden."],
]

const withReason = (text: string, reason: string | undefined) =>
  reason && reason !== "Rejected" ? `${text} (${reason})` : text

export const errorMiddleware: Middleware = store => next => action => {
  try {

    const result = next(action)

    if (updateParticipantPartial.rejected.match(action)) {
      // rejectWithValue sets error.message to "Rejected": without the default the raw key was shown
      const reason = (action.payload as Error | undefined)?.message
      store.dispatch(setErrorState({message: i18next.t(`${reason}_participant_update`,
        { ns: 'error', defaultValue: withReason("Das Mitglied konnte nicht gespeichert werden.", reason) })} as ErrorState))
    } else if(saveNewRate.rejected.match(action)) {
      store.dispatch(setErrorState({message: i18next.t(`${action.error.message}_tariff_create`, { ns: 'error' })} as ErrorState))
    } else {
      const hit = silentFailures.find(([thunk]) => thunk.match(action))
      if (hit) {
        store.dispatch(setErrorState({message: withReason(hit[1], (action as any).error?.message)} as ErrorState))
      }
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
      .concat(userApi.middleware)
      .concat(participantApi.middleware),
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
  activeParticipantsSelector1,
  meteringEnergyGroup11,
  (participants, report) => participants.flatMap(p => p.meters.map((m) => {
    return { meter: m, utilization: report[p.id]?.[m.meteringPoint] as number | undefined }
  }))
)

export const activeMeterEnergyGroup = createSelector(
  activeParticipantsSelector1,
  meteringEnergyGroup11,
  (participants, report) => participants.flatMap(p => p.meters.map(m => ({p, m}))).reduce((out, {p, m}) => {
    out[m.meteringPoint] = {m: m, utilization: report[p.id]?.[m.meteringPoint]}
    return out
  }, {} as Record<string, {m: Metering, utilization: number | undefined}>)
)
