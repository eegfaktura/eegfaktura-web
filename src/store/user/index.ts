import {UserData} from "../../models/user.model";
import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {userApi} from "./userApi";

export interface UserState {
  data:  { tenant: string, name: string }[] | null;
  error: any;
  token: string | null;
  loading: boolean;
}

const user = createSlice({
  name: "user",
  initialState: {
    data: null,
    error: null,
    loading: false,
    token: null,
  } as UserState,
  reducers: {
    signIn: (state: UserState, action: PayloadAction<UserData>) => {
      state.token = action.payload.id
    },
    signOut: (state) => {
      state.error = null;
      state.loading = false;
      state.token = null;
    },
    clearUserData: (state) => {
      state.data = null;
      state.error = null;
      state.loading = false;
      state.token = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      userApi.endpoints.getUser.matchFulfilled,
      (state, { payload }) => {
        state.data = payload.data;
        state.error = null;
        state.loading = false;
      }
    );
  //   builder.addMatcher(userApi.endpoints.getUser.matchPending, (state) => {
  //     state.error = null;
  //     state.loading = true;
  //   });
  //   builder.addMatcher(
  //     userApi.endpoints.getUser.matchRejected,
  //     (state, { error }) => {
  //       state.data = null;
  //       state.error = error;
  //       state.loading = true;
  //     }
  //   );
  //   builder.addMatcher(
  //     authApi.endpoints.login.matchFulfilled,
  //     (state, { payload }) => {
  //       state.data = payload.data;
  //       state.error = null;
  //       state.loading = false;
  //       state.token = payload.token;
  //     }
  //   );
  //   builder.addMatcher(authApi.endpoints.login.matchPending, (state) => {
  //     state.data = null;
  //     state.error = null;
  //     state.loading = true;
  //     state.token = null;
  //   });
  //   builder.addMatcher(
  //     authApi.endpoints.login.matchRejected,
  //     (state, { error }) => {
  //       state.data = null;
  //       state.error = error;
  //       state.loading = true;
  //       state.token = null;
  //     }
  //   );
  },
});

export default user.reducer;

export const { signIn, signOut, clearUserData } = user.actions;