import type {
  LoginInfoFull,
  UserPreferences
} from '@utrad-ical/circus-api-schema';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

interface LoginUserState {
  isFetching: boolean;
  data: LoginInfoFull | null;
}

const slice = createSlice({
  name: 'loginUser',
  initialState: { isFetching: false, data: null } as LoginUserState,
  reducers: {
    fullLoginInfoLoaded: (state, action: PayloadAction<LoginInfoFull>) => {
      state.isFetching = false;
      state.data = action.payload;
    },
    loginInfoConfirmed: state => {
      state.isFetching = false;
    },
    loginInfoRequest: state => {
      state.isFetching = true;
    },
    loggedOut: state => {
      state.isFetching = false;
      state.data = null;
    },
    userPreferencesUpdated: (
      state,
      action: PayloadAction<{
        updates: UserPreferences;
      }>
    ) => {
      const { updates } = action.payload;
      if (!state.data) throw new Error('User not logged in');
      state.data.preferences = { ...state.data.preferences, ...updates };
    }
  }
});

export default slice.reducer;

export const {
  fullLoginInfoLoaded,
  loginInfoConfirmed,
  loginInfoRequest,
  loggedOut,
  userPreferencesUpdated
} = slice.actions;
