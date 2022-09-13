import Project, { ProjectRoles } from '../types/Project';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type GlobalPrivilege =
  | 'createProject'
  | 'deleteProject'
  | 'manageServer'
  | 'personalInfoView'
  | 'downloadVolume'
  | 'issueOnetime';

export interface SearchPreset {
  name: string;
  condition: any;
}

export type LabelColorsSettings = {
  useDefault: boolean;
  customColors: string[];
};

export type ScrollBarsSettings = {
  size: 'small' | 'large';
  position: 'right' | 'left' | 'top' | 'bottom';
  visibility: 'none' | 'always' | 'hover';
};

export interface UserPreferences {
  seriesSearchPresets?: SearchPreset[];
  caseSearchPresets?: SearchPreset[];
  pluginJobSearchPresets?: SearchPreset[];
  personalInfoView?: boolean;
  theme?: string;
  referenceLine?: boolean;
  initailAlphaForNewLabels?: number;
  interpolationMode?: string;
  scrollBarsInfo?: ScrollBarsSettings;
  scrollBars?: string;
  maintainAspectRatio?: boolean;
  fixCenterOfGravity?: boolean;
  dimmedOutlineFor2DLabels?: string;
  revisionMessageTemplates?: string[];
  labelColors?: LabelColorsSettings;
}

export type MyListResourceType = 'series' | 'clinicalCases' | 'jobs';

export interface MyList {
  myListId: string;
  resourceType: MyListResourceType;
  name: string;
  createdAt: Date;
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
    globalPrivileges: GlobalPrivilege[];
    groups: string[];
    lastLoginIp: string;
    lastLoginTime: string;
    loginEnabled: boolean;
    loginId: string;
    uploadFileMax: number;
    uploadFileSizeMaxBytes: number;
    userEmail: string;
    myLists: MyList[];
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
    },
    userPreferencesUpdated: (
      state,
      action: PayloadAction<{
        updates: Partial<UserPreferences>;
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
