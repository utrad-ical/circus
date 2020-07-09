import {
  createStore,
  combineReducers,
  compose,
  applyMiddleware,
  Reducer
} from 'redux';
import thunk from 'redux-thunk';

// The redux store should contain only information shared across pages,
// such as the login user information.

interface IconDefinition {
  glyph: string;
  color: string;
  backgroundColor: string;
}

interface Project {
  projectId: string;
  createdAt: string;
  updatedAt: string;
  icon: IconDefinition;
  projectName: string;
  description: string;
  tags: any[];
  windowPresets: any[];
  windowPriority: any[];
}

type ProjectRoles =
  | 'createProject'
  | 'deleteProject'
  | 'manageServer'
  | 'personalInfoView';

interface SearchPreset {
  name: string;
}

export interface LoginUser {
  isFetching: boolean;
  data: null | {
    craetedAt: string;
    updatedAt: string;
    description: string;
    dicomImageServer: string;
    domains: string[];
    globalPrivileges: string[];
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

export interface MessageBox {
  id: string;
  message: string;
  tag: string | null;
  style: string;
  dismissOnPageChange: boolean;
}

/**
 * Reducer for message boxes.
 */
const messages: Reducer<MessageBox[]> = (state = [], action) => {
  switch (action.type) {
    case 'MESSAGE_ADD': {
      let boxes;
      if (typeof action.tag === 'string') {
        boxes = state.filter(box => box.tag !== action.tag);
      } else {
        boxes = [...state];
      }
      boxes.push({
        id: action.id,
        message: action.message,
        tag: typeof action.tag === 'string' ? action.tag : null,
        style: action.style ? action.style : 'info',
        dismissOnPageChange: !!action.dismissOnPageChange
      });
      return boxes;
    }
    case 'MESSAGE_DISMISS_PAGE_CHANGE':
      return state.filter(box => box.dismissOnPageChange === true);
    case 'MESSAGE_DISMISS':
      return state.filter(box => box.id !== action.id);
  }
  return state;
};

export interface Search {
  isFetching: boolean;
  resource: string;
  filter: any;
  condition: any;
  sort: object;
  page: number;
  limit: number;
  items: any[];
  totalItems: number;
}

const searches: Reducer<{ [name: string]: Search }> = (state = {}, action) => {
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
  [pluginId: string]:
    | 'loading'
    | {
        icon: string;
      };
}

const plugin: Reducer<Plugins> = (state = {}, action) => {
  switch (action.type) {
    case 'LOADING_PLUGIN_INFO':
      state = {
        ...state,
        [action.pluginId]: 'loading'
      };
      break;
    case 'LOAD_PLUGIN_INFO':
      state = {
        ...state,
        [action.pluginId]: action.data
      };
      break;
  }
  return state;
};

const reducer = combineReducers({
  loginUser,
  messages,
  searches,
  plugin
});

const composeEnhancers =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const store = createStore(
  reducer,
  composeEnhancers(applyMiddleware(thunk))
);
