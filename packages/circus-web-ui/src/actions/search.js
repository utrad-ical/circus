import { api } from 'utils/api';
import { refreshUserInfo } from './login-management';
import { prompt, confirm } from 'rb/modal';

function beginQuery(params) {
  return async (dispatch, getState) => {
    const state = getState();
    const name = params.name;
    const search = state.searches[name];
    if (search && search.isFetching) {
      throw new Error('Previous search has not finished.');
    }

    const resource = params.resource || search.resource;
    const filter = params.filter || search.filter;
    const condition = params.condition || search.condition;
    const page = params.page || search.page;
    const sort = params.sort || search.sort;
    const limit = params.limit || search.limit;

    try {
      dispatch({
        type: 'SET_SEARCH_QUERY_BUSY',
        name,
        isFetching: true
      });
      const query = { filter, sort, page, limit };
      const result = await api(resource, { params: query });
      dispatch({
        type: 'LOAD_SEARCH_RESULTS',
        name,
        resource,
        filter,
        condition,
        sort,
        limit,
        page: result.page,
        items: result.items,
        totalItems: result.totalItems
      });
    } finally {
      dispatch({
        type: 'SET_SEARCH_QUERY_BUSY',
        name,
        isFetching: false
      });
    }
  };
}

export function startNewSearch(name, resource, filter, condition, sort) {
  // 'filter' is a query object sent to the server.
  // 'conditon' represents a state of a search condition panel,
  // from which `filter` is constructed.
  return beginQuery({
    name,
    resource,
    filter,
    condition,
    page: 1,
    limit: 20,
    sort
  });
}

export function changeSearchPage(name, page) {
  return beginQuery({ name, page });
}

export function changeSearchSort(name, sort) {
  return beginQuery({ name, sort });
}

export function changeSearchLimit(name, limit) {
  return beginQuery({ name, limit });
}

export function savePreset(name, condition) {
  return async (dispatch, getState) => {
    const state = getState();
    const user = state.loginUser.data;
    const key = name + 'SearchPresets';
    const presets = user.preferences[key];

    const presetName = await prompt('Preset name');
    if (!presetName || !presetName.length) return;

    if (presets.some(preset => preset.name === presetName)) {
      if (!await confirm(`Overwrite the existing preset "${presetName}"?`)) {
        return;
      }
    }

    dispatch({
      type: 'SET_SEARCH_QUERY_BUSY',
      name,
      isFetching: true
    });
    const newPresets = [
      { name: presetName, condition: JSON.stringify(condition) },
      ...user.preferences[key].filter(preset => preset.name !== presetName)
    ];
    await api('preferences', {
      method: 'patch',
      data: { [key]: newPresets }
    });
    dispatch(refreshUserInfo(true));
    dispatch({
      type: 'SET_SEARCH_QUERY_BUSY',
      name,
      isFetching: false
    });
  };
}
