import {BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError} from "@reduxjs/toolkit/query/react";
import {RootState} from "../../store";
import {EegParticipant} from "../../../models/members.model";
import {Api} from "../../../service";
import {handleUnauthorized} from "../../../service/base.service";

const API_API_SERVER = import.meta.env.VITE_API_SERVER_URL;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_API_SERVER}/participant`,
  prepareHeaders: async (headers, { getState }) => {
    // const token = (getState() as RootState).user.token;
    const token = await Api.authService.lookupToken()
    const tenant = (getState() as RootState).eeg.selectedTenant
    // If we have a token, set it in the header
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    // the community of the call (query args) wins: the selection can change while the token is looked up
    if (tenant && !headers.has("tenant")) {
      headers.set("tenant", tenant);
    }
    return headers;
  },
})

// a 401 goes through the same session check as the class services (handleErrors): an expired session goes to the
// login (WEB-CQ-24). The result stays as it is: the callers show their own text, the delete reads the error code.
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  if (result.error?.status === 401) {
    await handleUnauthorized(Api.authService).catch(() => { /* always rejects; the error is in result */ })
  }
  return result
}

export const participantApi = createApi({
  reducerPath: "participantApi",
  baseQuery,
  tagTypes: ["participants"],
  endpoints: (builder) => ({
    persistBusinessType: builder.mutation<EegParticipant, { tenant: string, participantId: string, value: { path: string, value: any } }>({
      query: (p) => ({
        url: `/v2/${p.participantId}`,
        method: 'PUT',
        headers: {tenant: p.tenant},
        body: JSON.stringify(p.value),
      }),
    }),
    deleteParticipant: builder.mutation<EegParticipant, { tenant: string, participantId: string }>({
      query: (p) => ({
        url: `/v2/${p.participantId}`,
        method: 'DELETE',
        headers: {tenant: p.tenant}
      })
    })
  }),
});

export const {
  usePersistBusinessTypeMutation,
  useDeleteParticipantMutation,
} = participantApi;
