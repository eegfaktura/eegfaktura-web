import {createApi, fetchBaseQuery} from "@reduxjs/toolkit/query/react";
import {RootState} from "../../store";
import {EegParticipant} from "../../../models/members.model";
import {Api} from "../../../service";

const API_API_SERVER = import.meta.env.VITE_API_SERVER_URL;

export const participantApi = createApi({
  reducerPath: "participantApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_API_SERVER}/participant`,
    prepareHeaders: async (headers, { getState }) => {
      // const token = (getState() as RootState).user.token;
      const token = await Api.authService.lookupToken()
      const tenant = (getState() as RootState).eeg.selectedTenant
      // If we have a token, set it in the header
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      if (tenant) {
        headers.set("tenant", tenant);
      }
      return headers;
    },
  }),
  tagTypes: ["participants"],
  endpoints: (builder) => ({
    persistBusinessType: builder.mutation<EegParticipant, { participantId: string, value: { path: string, value: any } }>({
      query: (p) => ({
        url: `/v2/${p.participantId}`,
        method: 'PUT',
        body: JSON.stringify(p.value),
      }),
      extraOptions: { maxRetries: 2 },
    }),
    deleteParticipant: builder.mutation<EegParticipant, { participantId: string }>({
      query: (p) => ({
        url: `/v2/${p.participantId}`,
        method: 'DELETE'
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
