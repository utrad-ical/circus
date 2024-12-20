import Application from 'pages/Application';
import React, { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

import AdminIndex from 'pages/admin/AdminIndex';
import GeneralAdmin from 'pages/admin/GeneralAdmin';
import GroupAdmin from 'pages/admin/GroupAdmin';
import PluginAdmin from 'pages/admin/PluginAdmin';
import PluginJobManagerAdmin from 'pages/admin/PluginJobManagerAdmin';
import PluginJobQueueAdmin from 'pages/admin/PluginJobQueueAdmin';
import ProjectAdmin from 'pages/admin/ProjectAdmin';
import UserAdmin from 'pages/admin/UserAdmin';
import CaseDetail from 'pages/case-detail/CaseDetail';
import CreateNewCase from 'pages/CreateNewCase';
import CreateNewJob from 'pages/CreateNewJob';
import HomePage from 'pages/HomePage';
import ImportCase from 'pages/ImportCase';
import ImportSeries from 'pages/ImportSeries';
import LoginScreen from 'pages/LoginScreen';
import MyCaseList from 'pages/mylist/MyCaseList';
import MyPluginJobList from 'pages/mylist/MyPluginJobList';
import MySeriesList from 'pages/mylist/MySeriesList';
import OneTimeLogin from 'pages/OneTimeLogin';
import PluginJobDetail from 'pages/plugin-job-detail/PluginJobDetail';
import Preferences from 'pages/Preferences';
import CaseSearch from 'pages/search/CaseSearch';
import PluginJobSearch from 'pages/search/PluginJobSearch';
import SeriesSearch from 'pages/search/SeriesSearch';
import SeriesDetail from 'pages/SeriesDetail';
import TaskList from 'pages/TaskList';
import TokenManagement from 'pages/TokenManagement';

import { Provider as ReduxStoreProvider, useSelector } from 'react-redux';
import { dismissMessageOnPageChange } from 'store/messages';
import PluginJobQueueSearch from './pages/search/PluginJobQueueSearch';
import { store } from './store';
import GlobalStyle, { CircusThemeProvider } from './theme';

import {
  createVolumeLoaderManager,
  VolumeLoaderFactoryContext,
  VolumeLoaderManager
} from '@utrad-ical/circus-ui-kit';
import { ApiCaller, ApiContext, useApi } from 'utils/api';
import loginManager, { LoginManagerContext } from 'utils/loginManager';

require('./styles/main.less');

require('bootstrap/fonts/glyphicons-halflings-regular.woff');
require('bootstrap/fonts/glyphicons-halflings-regular.woff2');
require('bootstrap/fonts/glyphicons-halflings-regular.ttf');

const AppRoutes: React.FC<{}> = () => {
  return (
    <Application>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/plugin-job-queue" element={<PluginJobQueueSearch />} />
        <Route path="/import-series" element={<ImportSeries />} />
        <Route path="/import-case" element={<ImportCase />} />
        <Route path="/new-case/:seriesUid" element={<CreateNewCase />} />
        <Route path="/new-job/:seriesUid" element={<CreateNewJob />} />
        <Route path="/admin/general" element={<GeneralAdmin />} />
        <Route path="/admin/group" element={<GroupAdmin />} />
        <Route path="/admin/user" element={<UserAdmin />} />
        <Route path="/admin/project" element={<ProjectAdmin />} />
        <Route
          path="/admin/plugin-job-manager"
          element={<PluginJobManagerAdmin />}
        />
        <Route path="/admin/plugins" element={<PluginAdmin />} />
        <Route
          path="/admin/plugin-job-queue"
          element={<PluginJobQueueAdmin />}
        />
        <Route path="/admin" element={<AdminIndex />}></Route>

        <Route
          path="/browse/series/mylist/:myListId?"
          element={<MySeriesList />}
        />
        <Route
          path="/browse/series/preset/:presetName"
          element={<SeriesSearch />}
        />
        <Route path="/series/:uid" element={<SeriesDetail />} />
        <Route path="/browse/series" element={<SeriesSearch />} />

        <Route path="/browse/case/mylist/:myListId?" element={<MyCaseList />} />
        <Route
          path="/browse/case/preset/:presetName"
          element={<CaseSearch />}
        />
        <Route path="/case/:caseId" element={<CaseDetail />} />
        <Route path="/browse/case" element={<CaseSearch />} />

        <Route
          path="/browse/plugin-jobs/mylist/:myListId?"
          element={<MyPluginJobList />}
        />
        <Route
          path="/browse/plugin-jobs/preset/:presetName"
          element={<PluginJobSearch />}
        />
        <Route path="/plugin-job/:jobId" element={<PluginJobDetail />} />
        <Route path="/browse/plugin-jobs" element={<PluginJobSearch />} />

        <Route path="/task-list" element={<TaskList />} />
        <Route path="/preference" element={<Preferences />} />
        <Route path="/tokens" element={<TokenManagement />} />
      </Routes>
    </Application>
  );
};

const VolumeLoaderFactoryProvider: React.FC<{}> = ({ children }) => {
  const server = useSelector(state => state.loginUser.data?.dicomImageServer);
  const api = useApi();
  const token = api?.getToken();

  const provider = useMemo<VolumeLoaderManager>(
    () =>
      server && token
        ? createVolumeLoaderManager({ server, queryString: `token=${token}` })
        : (null as any),
    [server, token]
  );

  const currentProvider = useRef<VolumeLoaderManager>();
  useEffect(() => {
    if (currentProvider.current && currentProvider.current !== provider) {
      currentProvider.current.disconnect();
    }
    currentProvider.current = provider;
  }, [provider]);

  return (
    <VolumeLoaderFactoryContext.Provider value={provider}>
      {children}
    </VolumeLoaderFactoryContext.Provider>
  );
};

const InnerApp: React.FC<{ manager: ReturnType<typeof loginManager> }> = ({
  manager
}) => {
  const location = useLocation();
  useEffect(() => {
    // Hide message boxes which should not persist across page changes
    store.dispatch(dismissMessageOnPageChange());
    // Load user information again to check login status
    if (location.pathname !== '/') {
      manager?.refreshUserInfo(false);
    }
  }, [manager, location.pathname]);

  if (location.pathname === '/') return <LoginScreen />;
  return (
    <Routes>
      <Route path="/" element={<LoginScreen />} />
      <Route path="/otp" element={<OneTimeLogin />} />
      <Route path="/*" element={<AppRoutes />} />
    </Routes>
  );
};

const TheApp: React.FC<{}> = () => {
  const [manager, setManager] = useState<ReturnType<typeof loginManager>>();
  const [api, setApi] = useState<ApiCaller>();

  const handleStorageEvent = (event: StorageEvent) => {
    console.log('storage', event.key);
    switch (event.key) {
      case 'getSessionStorage': {
        // Send the current credentials to other tabs via localStorage
        localStorage.setItem(
          'transferCredentials',
          sessionStorage.getItem('tokenCredentials') ?? ''
        );
        localStorage.removeItem('transferCredentials');
        break;
      }
      case 'transferCredentials': {
        // Another tab sent credentials
        if (!event.newValue) return;
        if (location.pathname === '/') return;
        // Save the sent credentials to sessionStorage and recreate loginManger
        sessionStorage.setItem('tokenCredentials', event.newValue);
        const manager = loginManager('/', store.dispatch, api =>
          setApi(() => api!)
        );
        setManager(manager);
        if (manager.restoreApiCaller()) {
          manager.refreshUserInfo(true);
        }
        break;
      }
    }
  };

  useEffect(() => {
    window.addEventListener('storage', handleStorageEvent);
    if (!sessionStorage.length) {
      localStorage.setItem('getSessionStorage', 'a new tab has been created');
      localStorage.removeItem('getSessionStorage');
    }

    // First-time login management
    const manager = loginManager('/', store.dispatch, api =>
      setApi(() => api!)
    );
    setManager(manager);
    if (manager.restoreApiCaller()) {
      manager.refreshUserInfo(true);
    }
  }, []);

  if (!manager) return null;

  return (
    <LoginManagerContext.Provider value={manager}>
      <ApiContext.Provider value={api}>
        <ReduxStoreProvider store={store}>
          <VolumeLoaderFactoryProvider>
            <CircusThemeProvider>
              <GlobalStyle />
              <BrowserRouter>
                <InnerApp manager={manager} />
              </BrowserRouter>
            </CircusThemeProvider>
          </VolumeLoaderFactoryProvider>
        </ReduxStoreProvider>
      </ApiContext.Provider>
    </LoginManagerContext.Provider>
  );
};

ReactDOM.render(
  <StrictMode>
    <TheApp />
  </StrictMode>,
  document.getElementById('app')
);
