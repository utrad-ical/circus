import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ApiCaller } from '#utils/api.ts';
import type { AppThunk } from './index.ts';

export interface Users {
  [userEmail: string]: 'loading' | { userEmail: string; description: string };
}

const slice = createSlice({
  name: 'users',
  initialState: {} as Users,
  reducers: {
    userInfoLoading: (state, action: PayloadAction<string>) => {
      state[action.payload] = 'loading';
    },
    userInfoLoaded: (
      state,
      action: PayloadAction<{
        userEmail: string;
        description: string;
      }>
    ) => {
      state[action.payload.userEmail] = action.payload;
    }
  }
});

export default slice.reducer;

export const { userInfoLoading, userInfoLoaded } = slice.actions;

export const loadUserInfo = (api: ApiCaller, userEmail: string): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    if (state.users[userEmail]) return;
    dispatch(userInfoLoading(userEmail));
    const userData = await api(`users/${userEmail}`);
    dispatch(userInfoLoaded(userData));
  };
};
