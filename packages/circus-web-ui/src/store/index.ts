import { Action, configureStore } from '@reduxjs/toolkit';
import { combineReducers, Reducer } from 'redux';
import { ThunkAction } from 'redux-thunk';
import Plugin from '../types/Plugin';
import Project, { ProjectRoles } from '../types/Project';
import messages from './message-box';

// The redux store will contain only "global" information shared across pages,
// such as the login user information.

type GlobalPrivileges =
  | 'createProject'
  | 'deleteProject'
  | 'manageServer'
  | 'personalInfoView';

export interface SearchPreset {
  name: string;
  condition: any;
}

export interface LoginUser {
  isFetching: boolean;
  data: null | {
    craetedAt: string;
    updatedAt: string;
    description: string;
    dicomImageServer: string;
    domains: string[];
    defaultDomain: string | null;
    globalPrivileges: GlobalPrivileges[];
    groups: string[];
    lastLoginIp: string;
    lastLoginTime: string;
    loginEnabled: boolean;
    loginId: string;
    uploadFileMax: number;
    uploadFileSizeMax: string;
    userEmail: string;
    preferences: {
      seriesSearchPresets?: SearchPreset[];
      caseSearchPresets?: SearchPreset[];
      pluginJobSearchPresets?: SearchPreset[];
      personalInfoView?: boolean;
      theme?: string;
    };
    accessibleProjects: Array<{
      projectId: string;
      project: Project;
      roles: ProjectRoles[];
    }>;
  };
}

/**
 * Reducer for login user.
 */
const loginUser: Reducer<LoginUser> = (
  state = { isFetching: false, data: null },
  action
) => {
  switch (action.type) {
    case 'LOAD_FULL_LOGIN_INFO':
      return { isFetching: false, data: action.loginUser };
    case 'CONFIRM_LOGIN_INFO':
      return { ...state, isFetching: false };
    case 'REQUEST_LOGIN_INFO':
      return { ...state, isFetching: true };
    case 'LOGGED_OUT':
      return { isFetching: false, data: null };
  }
  return state;
};

export interface Search<T> {
  isFetching: boolean;
  resource: string;
  filter: any;
  condition: any;
  sort: object;
  page: number;
  limit: number;
  items: T[];
  totalItems: number;
}

const searches: Reducer<{ [name: string]: Search<any> }> = (
  state = {},
  action
) => {
  switch (action.type) {
    case 'SET_SEARCH_QUERY_BUSY':
      state = {
        ...state,
        [action.name]: {
          ...(state[action.name] || {}),
          isFetching: action.isFetching
        }
      };
      break;
    case 'LOAD_SEARCH_RESULTS':
      state = {
        ...state,
        [action.name]: {
          isFetching: false,
          resource: action.resource,
          filter: action.filter,
          condition: action.condition,
          sort: action.sort,
          page: action.page,
          limit: action.limit,
          items: action.items,
          totalItems: action.totalItems
        }
      };
      break;
    case 'DELETE_SEARCH':
      state = { ...state };
      delete state[action.name];
      break;
  }
  return state;
};

export interface Plugins {
  [pluginId: string]: 'loading' | Plugin;
}

const plugin: Reducer<Plugins> = (state = {}, action) => {
  switch (action.type) {
    case 'LOADING_PLUGIN_INFO':
      return {
        ...state,
        [action.pluginId]: 'loading'
      };
    case 'LOAD_PLUGIN_INFO':
      return {
        ...state,
        [action.pluginId]: action.data
      };
  }
  return state;
};

export interface Users {
  [userEmail: string]: 'loading' | { userEmail: string; description: string };
}

const user: Reducer<Users> = (state = {}, action) => {
  switch (action.type) {
    case 'LOADING_USER_INFO':
      return {
        ...state,
        [action.userEmail]: 'loading'
      };
    case 'LOAD_USER_INFO':
      return {
        ...state,
        [action.userEmail]: action.data
      };
  }
  return state;
};

const reducer = combineReducers({
  loginUser,
  messages,
  searches,
  plugin,
  user
});

export const store = configureStore({ reducer });
export const dispatch = store.dispatch;

export type RootState = ReturnType<typeof reducer>;

/**
 * The thunk action type. See the advanced tutorial of Redux Toolkit.
 */
export type AppThunk = ThunkAction<
  void, // the thunk doesn't return anything
  RootState, // state type for getState
  unknown, // no extra argument
  Action<string> // dispatch will accept this action type
>;
