import {createApi, fetchBaseQuery} from "@reduxjs/toolkit/query/react";
import {RootState} from "../store";
import {UserData} from "../../models/user.model";

const API_API_SERVER = import.meta.env.VITE_API_SERVER_URL;

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_API_SERVER}/eeg/user`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).user.token;
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
  tagTypes: ["user"],
  endpoints: (builder) => ({
    getUser: builder.query<{ data: {tenant: string, name: string}[] }, void>({
      query: () => "/get-user",
      providesTags: ["user"],
      extraOptions: { maxRetries: 2 },
    }),
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
  useGetUserQuery,
//   // useTokenValidQuery,
  useLazyGetUserQuery,
//   // useGetGuestQuery,
//   // useLazyGetNotificationsQuery,
//   // useLazyGetGuestQuery,
//   // useGetNotificationsQuery,
//   // useUpdateNotificationIdMutation,
//   // useUploadProfilePictureMutation,
//   // useLazyGetFollowersListQuery,
//   // useLazyGetFollowingListQuery,
//   // useLazyLogoutQuery,
//   // useDeleteAccountMutation,
//   // useUpdateDataMutation,
//   // useGetFollowDetailsQuery,
//   // useLazyGetFollowDetailsQuery,
} = userApi;
