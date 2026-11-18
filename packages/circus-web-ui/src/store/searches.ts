import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { confirm, prompt } from '#components/dialogs.tsx';
import type { AppDispatch, AppThunk } from '#store/index.ts';
import type { PresetSearchName } from '#utils/searchPresets.ts';
import type {
  CaseSearchItem,
  Group,
  Plugin,
  PluginJob,
  PluginJobSearchItem,
  Project,
  SearchResponse,
  Series,
  UserForAdmin,
  UserPreferences
} from '@utrad-ical/circus-api-schema';
import { api } from '#utils/api.ts';
interface SearchItems {
  series: Series;
  cases: CaseSearchItem;
  'plugin-jobs': PluginJobSearchItem;
  pluginJobs: PluginJobSearchItem;
  'plugin-job-queue': PluginJob;
  'admin/plugin-job-queue': PluginJob;
  'admin/groups': Group;
  'admin/plugins': Plugin;
  'admin/projects': Project;
  'admin/users': UserForAdmin;
}

type SearchType = keyof SearchItems;
export type SearchItem = SearchItems[SearchType];

export type SearchResource = {
  [Type in SearchType]: { primaryKey: keyof SearchItems[Type] & string } & (
    | { endPoint: Type; resourceType?: undefined }
    | { endPoint: string; resourceType: Type }
  );
}[SearchType];

type SearchCache = { [Type in SearchType]?: Record<string, SearchItems[Type]> };

interface SearchParams {
  resource: SearchResource;
  /**
   * Query object sent to the server.
   */
  filter: object;
  /**
   * Represents a state of a search condition panel,
   * from which `filter` is constructed.
   */
  condition: object;
  sort: string; // of JSON
  page: number;
  limit: number;
}

type NewSearchParams = Partial<Pick<SearchParams, 'page' | 'limit'>> &
  Omit<SearchParams, 'page' | 'limit'>;

export interface SearchState {
  searches: {
    [searchName: string]: SearchResult;
  };
  items: SearchCache;
  nextPreviousList: string[];
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
  items: { series: {} },
  nextPreviousList: []
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
        data: SearchResponse<SearchItem>;
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
      // The endpoint and its cache key identify the type of all the rows.
      const cache: Partial<Record<SearchType, Record<string, SearchItem>>> =
        state.items;
      const items = (cache[rType] ??= {});
      const indexes = rawItems.map(item => {
        const id = String((item as Record<string, unknown>)[primaryKey]);
        items[id] = item;
        return id;
      });
      search.results = { indexes, totalItems };
    },
    deleteSearch: (state, action: PayloadAction<string>) => {
      const searchName = action.payload;
      delete state.searches[searchName];
    },
    setNextPreviousList: (state, action: PayloadAction<string[]>) => {
      state.nextPreviousList = action.payload;
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
  setNextPreviousList
} = slice.actions;

export default slice.reducer;

// internal
const executeQuery = async (
  dispatch: AppDispatch,
  searchName: string,
  params: SearchParams
) => {
  try {
    dispatch(startSearch({ searchName, params }));
    const data = await api<SearchResponse<SearchItem>>(
      params.resource.endPoint,
      {
        params: {
          filter: JSON.stringify(params.filter),
          sort: params.sort,
          page: params.page,
          limit: params.limit
        }
      }
    );
    dispatch(searchResultLoaded({ searchName, data }));
  } finally {
    dispatch(setBusy({ searchName, isFetching: false }));
  }
};

export const newSearch = (
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
    await executeQuery(dispatch, searchName, theParams);
  };
};

export const updateSearch = (
  searchName: string,
  partialParams: Partial<SearchParams>,
  onExecutePostProcess?: (search: SearchResult) => void
): AppThunk => {
  return async (dispatch, getState) => {
    let state = getState();
    let search = state.searches.searches[searchName];
    if (!search) throw new Error('There is no previous search.');
    if (search.isFetching) throw new Error('Previous search has not finished.');
    const newParams = { ...search.params, ...partialParams };
    await executeQuery(dispatch, searchName, newParams);

    if (onExecutePostProcess) {
      state = getState();
      search = state.searches.searches[searchName];
      onExecutePostProcess(search);
    }
  };
};

export const savePreset = (
  searchName: PresetSearchName,
  condition: object
): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    const user = state.loginUser.data!;
    const key = `${searchName}SearchPresets` as const;
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
    await api<unknown, UserPreferences>('preferences', {
      method: 'patch',
      data: { [key]: newPresets }
    });
    dispatch(setBusy({ searchName, isFetching: false }));
  };
};
