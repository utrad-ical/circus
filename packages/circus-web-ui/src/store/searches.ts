import { createSlice, PayloadAction, ThunkDispatch } from '@reduxjs/toolkit';
import { confirm, prompt } from '@smikitky/rb-components/lib/modal';
import { AppDispatch, AppThunk } from 'store';
import { ApiCaller } from 'utils/api';
import Series from 'types/Series';
import Task from 'types/Task';

export interface SearchResource {
  endPoint: string;
  primaryKey: string;
  resourceType?: string;
}

interface SearchParams {
  resource: SearchResource;
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

export interface SearchedResource<T> {
  [id: string]: T;
}

interface SearchState {
  searches: {
    [searchName: string]: SearchResult;
  };
  items: {
    series: SearchedResource<Series>;
    tasks: SearchedResource<Task>;
    [resourceName: string]: SearchedResource<any>;
  };
}

export interface SearchResult {
  params: SearchParams;
  isFetching: boolean;
  results?: {
    indexes: string[];
    totalItems: number;
  };
  selected: string[];
}

const initialState: SearchState = {
  searches: {},
  items: { series: {}, tasks: {} }
};

const slice = createSlice({
  name: 'searches',
  initialState,
  reducers: {
    reset: () => initialState,
    startSearch: (
      state,
      action: PayloadAction<{
        searchName: string;
        params: SearchParams;
      }>
    ) => {
      const { searchName, params } = action.payload;
      if (!(searchName in state.searches))
        state.searches[searchName] = { params, isFetching: true, selected: [] };
      state.searches[searchName].isFetching = true;
      state.searches[searchName].params = params;
    },
    clearSearch: (state, action: PayloadAction<{ searchName: string }>) => {
      const { searchName } = action.payload;
      if (state.searches[searchName])
        state.searches[searchName].results = undefined;
    },
    setBusy: (
      state,
      action: PayloadAction<{ searchName: string; isFetching: boolean }>
    ) => {
      const { searchName, isFetching } = action.payload;
      state.searches[searchName].isFetching = isFetching;
    },
    changeSelection: (
      state,
      action: PayloadAction<{ searchName: string; ids: string[] }>
    ) => {
      const { searchName, ids } = action.payload;
      state.searches[searchName].selected = ids;
    },
    selectionStatusChanged: (
      state,
      action: PayloadAction<{
        searchName: string;
        id: string;
        isSelected: boolean;
      }>
    ) => {
      const { searchName, id, isSelected } = action.payload;
      const items = state.searches[searchName].selected;
      if (isSelected && items.indexOf(id) < 0) {
        items.push(id);
      }
      if (!isSelected) {
        const index = items.indexOf(id);
        if (index >= 0) items.splice(index, 1);
      }
    },
    searchResultLoaded: (
      state,
      action: PayloadAction<{
        searchName: string;
        data: { items: any[]; page: number; totalItems: number };
      }>
    ) => {
      const {
        searchName,
        data: { items: rawItems, page, totalItems }
      } = action.payload;
      const search = state.searches[searchName]!;
      const { endPoint, resourceType, primaryKey } = search.params.resource;
      const rType = resourceType || endPoint;
      search.isFetching = false;
      search.params.page = page;
      const items = state.items[rType] ?? {};
      state.items[rType] = items;
      rawItems.forEach(i => (items[String(i[primaryKey])] = i));
      search.results = {
        indexes: rawItems.map(i => i[primaryKey]),
        totalItems
      };
    },
    deleteSearch: (state, action: PayloadAction<string>) => {
      const searchName = action.payload;
      delete state.searches[searchName];
    },
    dismissTask: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      if (!state.items.tasks || !state.items.tasks[taskId]) return;
      state.items.tasks[taskId].dismissed = true;
    }
  }
});

// We will not export these "primitive" actions for now
const {
  startSearch,
  clearSearch,
  changeSelection,
  setBusy,
  searchResultLoaded
} = slice.actions;
// But we export these ones
export const {
  reset,
  selectionStatusChanged,
  deleteSearch,
  dismissTask
} = slice.actions;

export default slice.reducer;

// internal
const executeQuery = async (
  dispatch: AppDispatch,
  api: ApiCaller,
  searchName: string,
  params: SearchParams
) => {
  try {
    dispatch(startSearch({ searchName, params }));
    const data = await api(params.resource.endPoint, {
      params: {
        filter: params.filter,
        sort: params.sort,
        page: params.page,
        limit: params.limit
      }
    });
    dispatch(searchResultLoaded({ searchName, data }));
  } finally {
    dispatch(setBusy({ searchName, isFetching: false }));
  }
};

export const newSearch = (
  api: ApiCaller,
  searchName: string,
  params: NewSearchParams,
  clearPrevious?: boolean
): AppThunk => {
  const theParams: SearchParams = { limit: 20, page: 1, ...params };
  return async (dispatch, getState) => {
    const state = getState();
    // if (state.searches.searches[searchName]?.isFetching)
    //   throw new Error('Previous search has not finished.');
    if (clearPrevious) dispatch(clearSearch({ searchName }));
    if (state.searches.searches[searchName]) {
      dispatch(changeSelection({ searchName, ids: [] }));
    }
    await executeQuery(dispatch, api, searchName, theParams);
  };
};

export const updateSearch = (
  api: ApiCaller,
  searchName: string,
  partialParams: Partial<SearchParams>
): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    const search = state.searches.searches[searchName];
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
