import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApiCaller } from 'utils/api';
import { AppThunk } from './index';
import Plugin from '../types/Plugin';

export interface Plugins {
  [pluginId: string]: 'loading' | Plugin;
}

const slice = createSlice({
  name: 'plugins',
  initialState: {} as Plugins,
  reducers: {
    pluginInfoLoading: (state, action: PayloadAction<string>) => {
      state[action.payload] = 'loading';
    },
    pluginInfoLoaded: (state, action: PayloadAction<Plugin>) => {
      state[action.payload.pluginId] = action.payload;
    }
  }
});

export default slice.reducer;

export const { pluginInfoLoading, pluginInfoLoaded } = slice.actions;

export const loadPluginInfo = (api: ApiCaller, pluginId: string): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    if (state.plugins[pluginId]) return;
    dispatch(pluginInfoLoading(pluginId));
    const userData = await api(`plugins/${pluginId}`);
    dispatch(pluginInfoLoaded(userData));
  };
};
