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
    // logout: builder.query<{ msg: string }, null>({
    //   query: () => "/logout",
    //   providesTags: ["user"],
    //   extraOptions: { maxRetries: 2 },
    // }),
    // getGuest: builder.query<{ data: IGuestData }, { id: string }>({
    //   query: ({ id }) => `/get-guest?id=${id}`,
    //   providesTags: ["guest"],
    //   keepUnusedDataFor: 10,
    // }),
    // getNotifications: builder.query<{ notifications: Notifications[] }, null>({
    //   query: () => `/get-notifications`,
    //   keepUnusedDataFor: 10,
    // }),
    // getFollowDetails: builder.query<
    //   { following: string; followers: string },
    //   null
    // >({
    //   query: () => "/get-follows",
    //   providesTags: ["user"],
    //   extraOptions: { maxRetries: 2 },
    // }),
    // tokenValid: builder.query<{ msg: boolean }, null>({
    //   query: () => "/token-valid",
    //   providesTags: ["user"],
    //   extraOptions: { maxRetries: 0 },
    // }),
    // uploadProfilePicture: builder.mutation<
    //   { photo: string },
    //   { mimeType: string; uri: string }
    // >({
    //   query: (payload) => {
    //     const blob: any = {
    //       name: `${payload.uri.split("/").splice(-1)}`,
    //       type: payload.mimeType,
    //       uri: payload.uri,
    //     };
    //     const formData = new FormData();
    //
    //     formData.append("photo", blob);
    //     return {
    //       url: "/update-photo",
    //       method: "POST",
    //       body: formData,
    //       headers: {
    //         "Content-type": "multipart/form-data",
    //       },
    //     };
    //   },
    //   invalidatesTags: ["user"],
    // }),
    // updateNotificationId: builder.mutation<any, { notificationId: string }>({
    //   query: (payload) => {
    //     return {
    //       url: "/update-notification-id",
    //       method: "PUT",
    //       body: { notificationId: payload.notificationId },
    //       headers: {
    //         "Content-type": "application/json; charset=UTF-8",
    //       },
    //     };
    //   },
    // }),
    // getFollowingList: builder.query<
    //   FollowingData[],
    //   { take: number; skip: number }
    // >({
    //   query: ({ take, skip }) => `/get-following?take=${take}&skip=${skip}`,
    //   providesTags: ["user"],
    // }),
    // getFollowersList: builder.query<
    //   FollowData[],
    //   { take: number; skip: number }
    // >({
    //   query: ({ take, skip }) => `/get-followers?take=${take}&skip=${skip}`,
    //   providesTags: ["user"],
    // }),
    // updateData: builder.mutation<
    //   { msg: string },
    //   {
    //     userName?: string;
    //     password: string;
    //     newPassword?: string;
    //     name?: string;
    //   }
    // >({
    //   query: ({ userName, password, newPassword, name }) => {
    //     return {
    //       url: "/update-data",
    //       method: "PUT",
    //       body: { userName, password, newPassword, name },
    //       headers: {
    //         "Content-type": "application/json; charset=UTF-8",
    //       },
    //     };
    //   },
    //   invalidatesTags: ["user"],
    // }),
    // deleteAccount: builder.mutation<
    //   { msg: string },
    //   {
    //     userName?: string;
    //     password: string;
    //     newPassword?: string;
    //     name?: string;
    //   }
    // >({
    //   query: ({ password }) => {
    //     return {
    //       url: "/delete-account",
    //       method: "DELETE",
    //       body: { password },
    //       headers: {
    //         "Content-type": "application/json; charset=UTF-8",
    //       },
    //     };
    //   },
    //   invalidatesTags: ["user"],
    // }),
  }),
});

export const {
  usePersistBusinessTypeMutation,
  useDeleteParticipantMutation,
} = participantApi;
