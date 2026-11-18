import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { api } from '#utils/api.ts';
import type { AppThunk } from './index.ts';
import type { UserPublic } from '@utrad-ical/circus-api-schema';

type Users = Record<string, 'loading' | UserPublic>;

const slice = createSlice({
  name: 'users',
  initialState: {} as Users,
  reducers: {
    userInfoLoading: (state, action: PayloadAction<string>) => {
      state[action.payload] = 'loading';
    },
    userInfoLoaded: (state, action: PayloadAction<UserPublic>) => {
      state[action.payload.userEmail] = action.payload;
    }
  }
});

export default slice.reducer;

export const { userInfoLoading, userInfoLoaded } = slice.actions;

export const loadUserInfo = (userEmail: string): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    if (state.users[userEmail]) return;
    dispatch(userInfoLoading(userEmail));
    const userData = await api<UserPublic>(`users/${userEmail}`);
    dispatch(userInfoLoaded(userData));
  };
};
