import Application from 'pages/Application';
import React, { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useLocation
} from 'react-router-dom';
import useLoginUser from 'utils/useLoginUser';
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
import GlobalStyle, { themes } from './theme';

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

const RootApp: React.FC<{ manager: ReturnType<typeof loginManager> }> = ({
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

  return <Outlet />;
};

const AppInner: React.FC<{ manager: ReturnType<typeof loginManager> }> = ({
  manager
}) => {
  const user = useLoginUser();
  const theme =
    user && user.preferences.theme === 'mode_black' ? 'dark' : 'light';

  return (
    <>
      <GlobalStyle theme={themes[theme]} />
      <RootApp manager={manager} />
    </>
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

  const router = createBrowserRouter([
    {
      path: '/',
      element: (
        <LoginManagerContext.Provider value={manager}>
          <ApiContext.Provider value={api}>
            <ReduxStoreProvider store={store}>
              <VolumeLoaderFactoryProvider>
                <AppInner manager={manager} />
              </VolumeLoaderFactoryProvider>
            </ReduxStoreProvider>
          </ApiContext.Provider>
        </LoginManagerContext.Provider>
      ),
      children: [
        { index: true, element: <LoginScreen /> },
        { path: 'otp', element: <OneTimeLogin /> },
        {
          path: '',
          element: (
            <Application>
              <Outlet />
            </Application>
          ),
          children: [
            { path: 'home', element: <HomePage /> },
            { path: 'plugin-job-queue', element: <PluginJobQueueSearch /> },
            { path: 'import-series', element: <ImportSeries /> },
            { path: 'import-case', element: <ImportCase /> },
            { path: 'new-case/:seriesUid', element: <CreateNewCase /> },
            { path: 'new-job/:seriesUid', element: <CreateNewJob /> },
            {
              path: 'admin',
              children: [
                { path: 'general', element: <GeneralAdmin /> },
                { path: 'group', element: <GroupAdmin /> },
                { path: 'user', element: <UserAdmin /> },
                { path: 'project', element: <ProjectAdmin /> },
                {
                  path: 'plugin-job-manager',
                  element: <PluginJobManagerAdmin />
                },
                { path: 'plugins', element: <PluginAdmin /> },
                { path: 'plugin-job-queue', element: <PluginJobQueueAdmin /> },
                { index: true, element: <AdminIndex /> }
              ]
            },
            {
              path: 'browse',
              children: [
                {
                  path: 'series',
                  children: [
                    { path: 'mylist/:myListId?', element: <MySeriesList /> },
                    { path: 'preset/:presetName', element: <SeriesSearch /> },
                    { index: true, element: <SeriesSearch /> }
                  ]
                },
                {
                  path: 'case',
                  children: [
                    { path: 'mylist/:myListId?', element: <MyCaseList /> },
                    { path: 'preset/:presetName', element: <CaseSearch /> },
                    { index: true, element: <CaseSearch /> }
                  ]
                },
                {
                  path: 'plugin-jobs',
                  children: [
                    { path: 'mylist/:myListId?', element: <MyPluginJobList /> },
                    {
                      path: 'preset/:presetName',
                      element: <PluginJobSearch />
                    },
                    { index: true, element: <PluginJobSearch /> }
                  ]
                }
              ]
            },
            { path: 'series/:uid', element: <SeriesDetail /> },
            { path: 'case/:caseId', element: <CaseDetail /> },
            { path: 'plugin-job/:jobId', element: <PluginJobDetail /> },
            { path: 'task-list', element: <TaskList /> },
            { path: 'preference', element: <Preferences /> },
            { path: 'tokens', element: <TokenManagement /> }
          ]
        }
      ]
    }
  ]);

  return <RouterProvider router={router} />;
};

ReactDOM.render(
  <StrictMode>
    <TheApp />
  </StrictMode>,
  document.getElementById('app')
);
