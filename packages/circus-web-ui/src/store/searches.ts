import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { confirm, prompt } from '@smikitky/rb-components/lib/modal';
import { AppThunk } from 'store';
import { ApiCaller } from 'utils/api';

interface SearchParams {
  resource: string;
  /**
   * Query object sent to the server.
   */
  filter: object;
  /**
   * Represents a state of a search condition panel,
   * from whihc `filter` is constructed.
   */
  condition: object;
  sort: string; // of JSON
  page: number;
  limit: number;
}

type NewSearchParams = Partial<Pick<SearchParams, 'page' | 'limit'>> &
  Omit<SearchParams, 'page' | 'limit'>;

interface SearchResults<T> {
  items: T[];
  totalItems: number;
}

export interface Search<T> {
  params: SearchParams;
  isFetching: boolean;
  results?: SearchResults<T>;
}

interface Searches {
  [searchName: string]: Search<unknown>;
}

const slice = createSlice({
  name: 'searches',
  initialState: {} as Searches,
  reducers: {
    startSearch: (
      state,
      action: PayloadAction<{ searchName: string; params: SearchParams }>
    ) => {
      const { searchName, params } = action.payload;
      if (!(searchName in state))
        state[searchName] = { isFetching: true, params };
      state[searchName].isFetching = true;
      state[searchName].params = params;
    },
    setBusy: (
      state,
      action: PayloadAction<{ searchName: string; isFetching: boolean }>
    ) => {
      const { searchName, isFetching } = action.payload;
      state[searchName].isFetching = isFetching;
    },
    searchResultLoaded: (
      state,
      action: PayloadAction<{
        searchName: string;
        page: number;
        results: SearchResults<unknown>;
      }>
    ) => {
      const { searchName, page, results } = action.payload;
      state[searchName].isFetching = false;
      state[searchName].params.page = page;
      state[searchName].results = results;
    },
    deleteSearch: (state, action: PayloadAction<string>) => {
      const searchName = action.payload;
      delete state[searchName];
    }
  }
});

// We will not export these "primitive" actions for now
const { startSearch, setBusy, searchResultLoaded } = slice.actions;
// But we export this one
export const { deleteSearch } = slice.actions;

export default slice.reducer;

// internal
const executeQuery = async (
  dispatch: any,
  api: ApiCaller,
  searchName: string,
  params: SearchParams
) => {
  try {
    dispatch(startSearch({ searchName, params }));
    const result = await api(params.resource, {
      params: {
        filter: params.filter,
        sort: params.sort,
        page: params.page,
        limit: params.limit
      }
    });
    dispatch(
      searchResultLoaded({
        searchName,
        page: result.page,
        results: { items: result.items, totalItems: result.totalItems }
      })
    );
  } finally {
    dispatch(setBusy({ searchName, isFetching: false }));
  }
};

export const newSearch = (
  api: ApiCaller,
  searchName: string,
  params: NewSearchParams
): AppThunk => {
  const useParams: SearchParams = { limit: 20, page: 1, ...params };
  return async (dispatch, getState) => {
    const state = getState();
    if (state.searches[searchName]?.isFetching)
      throw new Error('Previous search has not finished.');
    await executeQuery(dispatch, api, searchName, useParams);
  };
};

export const updateSearch = (
  api: ApiCaller,
  searchName: string,
  partialParams: Partial<SearchParams>
): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    const search = state.searches[searchName];
    if (!search) throw new Error('There is no previous search.');
    if (search.isFetching) throw new Error('Previous search has not finished.');
    const newParams = { ...search.params, ...partialParams };
    await executeQuery(dispatch, api, searchName, newParams);
  };
};

export const savePreset = (
  api: ApiCaller,
  searchName: string,
  condition: any
): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    const user = state.loginUser.data!;
    const key = (searchName + 'SearchPresets') as
      | 'seriesSearchPresets'
      | 'caseSearchPresets'
      | 'pluginJobSearchPresets';
    const presets = user.preferences[key];

    const presetName = await prompt('Preset name');
    if (!presetName || !presetName.length) return;

    if (presets && presets.some(preset => preset.name === presetName)) {
      const message = `Overwrite the existing preset "${presetName}"?`;
      if (!(await confirm(message))) return;
    }

    dispatch(setBusy({ searchName, isFetching: true }));
    const newPresets = [
      { name: presetName, condition: JSON.stringify(condition) },
      ...(presets ?? []).filter(preset => preset.name !== presetName)
    ];
    await api('preferences', { method: 'patch', data: { [key]: newPresets } });
    dispatch(setBusy({ searchName, isFetching: false }));
  };
};
