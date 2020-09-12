import Project, { ProjectRoles } from '../types/Project';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type GlobalPrivileges =
  | 'createProject'
  | 'deleteProject'
  | 'manageServer'
  | 'personalInfoView';

export interface SearchPreset {
  name: string;
  condition: any;
}

export interface UserPreferences {
  seriesSearchPresets?: SearchPreset[];
  caseSearchPresets?: SearchPreset[];
  pluginJobSearchPresets?: SearchPreset[];
  personalInfoView?: boolean;
  theme?: string;
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
    uploadFileSizeMaxBytes: number;
    userEmail: string;
    preferences: UserPreferences;
    accessibleProjects: Array<{
      projectId: string;
      project: Project;
      roles: ProjectRoles[];
    }>;
  };
}

const slice = createSlice({
  name: 'loginUser',
  initialState: { isFetching: false, data: null } as LoginUser,
  reducers: {
    fullLoginInfoLoaded: (state, action: PayloadAction<any>) => {
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
    }
  }
});

export default slice.reducer;

export const {
  fullLoginInfoLoaded,
  loginInfoConfirmed,
  loginInfoRequest,
  loggedOut
} = slice.actions;
