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
    }),
  }),
});

export const {
  useGetUserQuery,
  useLazyGetUserQuery,
} = userApi;
