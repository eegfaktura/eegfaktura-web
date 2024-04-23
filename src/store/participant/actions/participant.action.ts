import {createAction, createAsyncThunk} from "@reduxjs/toolkit";
import {featureKey} from "../states/participant.state";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import {HttpError} from "../../../service/base.service";
import {SelectedPeriod} from "../../../models/energy.model";
import {Api} from "../../../service";

export const fetchParticipantModel = createAsyncThunk(
  `${featureKey}/fetchParticipants`,
  async (arg: { token?: string, tenant: string, period?: SelectedPeriod }) => {
    const { token, tenant, period } = arg;
    const result = await Api.eegService.fetchParicipants(tenant, token, period);
    return { participants: result };
  }
)

// export const newParticipant = createAsyncThunk(
//   `${featureKey}/new`,
//   async (arg: {participant: EegParticipant}) => {
//     return arg
//   }
// )
export const newParticipant = createAction<EegParticipant>(`${featureKey}/new`);

export const saveNewParticipant = createAsyncThunk(
  `${featureKey}/save`,
  async (arg: {participant: EegParticipant}) => {
    return arg
  }
)

export const chancelNewParticipant = createAsyncThunk(
  `${featureKey}/chancel`,
  async () => {
    return undefined
  }
)

// export const addMeteringPoint = createAsyncThunk(
//   `${featureKey}/addMeter`,
//   async (arg: {meter: Metering}) => {
//     return arg
//   }
// )

export const addMeteringPoint = createAction<Metering>(`${featureKey}/meter/add`)

export const selectParticipant = createAction<string>(`${featureKey}/select/participant`);

export const selectMetering = createAction<string>(`${featureKey}/select/meter`)

export const createParticipant = createAsyncThunk(
  `${featureKey}/create`,
  async (arg: { tenant: string, participant: EegParticipant }) => {
    const {participant, tenant} = arg
    return await Api.eegService.createParticipant(tenant, participant);
  }
)

export const updateParticipant = createAsyncThunk(
  `${featureKey}/update`,
  async (arg: { tenant: string, participant: EegParticipant }) => {
    const {participant, tenant} = arg
    return await Api.eegService.updateParticipant(tenant, participant);
  }
)

export const updateParticipantPartial = createAsyncThunk(
  `${featureKey}/update/partial`,
  async (arg: { tenant: string, participantId: string, value: {path: string, value: any }}, thunkAPI) => {
    const {tenant, participantId, value} = arg
    try {
      return await Api.participantService.updateParticipantPartial(tenant, participantId, value);
    } catch(e) {
      return thunkAPI.rejectWithValue(e)
    }
  }

)

export const registerMeteringpoint = createAsyncThunk(
  `${featureKey}/meter/create`,
  async (arg: { tenant: string, participantId: string, meter: Metering }) => {
    const {participantId, tenant, meter} = arg
    return await Api.eegService.createMeteringPoint(tenant, participantId, meter);
  }
)

export const updateMeteringPoint = createAsyncThunk(
  `${featureKey}/meter/update`,
  async (args: {tenant: string, participantId: string, meter: Metering}) => {
    const {tenant, participantId, meter} = args
    const res = await Api.eegService.updateMeteringPoint(tenant, participantId, meter);
    return {meter: res, participantId: participantId}
  }
)

export const updateMeteringPointPartFact = createAsyncThunk(
  `${featureKey}/meter/update/participantPartFact`,
  async (args: {tenant: string, participantId: string, meter: string, value: number}) => {
    const {tenant, participantId, meter, value} = args
    const res = await Api.eegService.updateMeteringPointPartFact(tenant, participantId, meter, value);
    return {meter: res, participantId: participantId}
  }
)

export const moveMeteringPoint = createAsyncThunk(
  `${featureKey}/meter/move`,
  async (args: {tenant: string, sParticipantId: string, dParticipantId: string, meter: Metering}) => {
    const {tenant, sParticipantId, dParticipantId, meter} = args
    const res = await Api.eegService.moveMeteringPoint(tenant, sParticipantId, dParticipantId, meter);
    return {meter: res, sParticipantId: sParticipantId, dParticipantId: dParticipantId}
  }
)

export const removeMeteringPoint = createAsyncThunk(
  `${featureKey}/meter/remove`,
  async (args: {tenant: string, participantId: string, meter: Metering}) => {
    const {tenant, participantId, meter} = args
    await Api.eegService.removeMeteringPoint(tenant, participantId, meter);
    return {meter: meter, participantId: participantId}
  }
)

export const confirmParticipant = createAsyncThunk(
  `${featureKey}/participant/confirm`,
  async (args: {tenant: string, participantId: string/*, data: FormData*/}) => {
    const {tenant, participantId} = args
    return await Api.eegService.confirmParticipant(tenant, participantId);
  }
)
/*
export const archiveParticipant = createAsyncThunk(
  `${featureKey}/archive`,
  async (arg: {participant: EegParticipant, tenant: string}, { rejectWithValue }) => {
    const {participant, tenant} = arg
    try {
      await Api.participantService.archiveParticipant(tenant, participant.id);
      return participant.id
    } catch (e) {
      if (e instanceof HttpError) {
        return rejectWithValue(e.reasonObject)
      }
      return rejectWithValue(e)
    }
  }
)
*/