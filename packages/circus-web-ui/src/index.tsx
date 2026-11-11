import Application from '#pages/Application.tsx';
import React, { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useLocation
} from 'react-router-dom';
import useLoginUser from '#utils/useLoginUser.ts';
import AdminIndex from '#pages/admin/AdminIndex.tsx';
import GeneralAdmin from '#pages/admin/GeneralAdmin.tsx';
import GroupAdmin from '#pages/admin/GroupAdmin.tsx';
import PluginAdmin from '#pages/admin/PluginAdmin.tsx';
import PluginJobManagerAdmin from '#pages/admin/PluginJobManagerAdmin.tsx';
import PluginJobQueueAdmin from '#pages/admin/PluginJobQueueAdmin.tsx';
import ProjectAdmin from '#pages/admin/ProjectAdmin.tsx';
import UserAdmin from '#pages/admin/UserAdmin.tsx';
import CaseDetail from '#pages/case-detail/CaseDetail.tsx';
import CreateNewCase from '#pages/CreateNewCase.tsx';
import CreateNewJob from '#pages/CreateNewJob.tsx';
import HomePage from '#pages/HomePage.tsx';
import ImportCase from '#pages/ImportCase.tsx';
import ImportSeries from '#pages/ImportSeries.tsx';
import LoginScreen from '#pages/LoginScreen.tsx';
import MyCaseList from '#pages/mylist/MyCaseList.tsx';
import MyPluginJobList from '#pages/mylist/MyPluginJobList.tsx';
import MySeriesList from '#pages/mylist/MySeriesList.tsx';
import OneTimeLogin from '#pages/OneTimeLogin.tsx';
import PluginJobDetail from '#pages/plugin-job-detail/PluginJobDetail.tsx';
import Preferences from '#pages/Preferences.tsx';
import CaseSearch from '#pages/search/CaseSearch.tsx';
import PluginJobSearch from '#pages/search/PluginJobSearch.tsx';
import SeriesSearch from '#pages/search/SeriesSearch.tsx';
import SeriesDetail from '#pages/SeriesDetail.tsx';
import TaskList from '#pages/TaskList.tsx';
import TokenManagement from '#pages/TokenManagement.tsx';

import { Provider as ReduxStoreProvider, useSelector } from 'react-redux';
import { dismissMessageOnPageChange } from '#store/messages.ts';
import PluginJobQueueSearch from './pages/search/PluginJobQueueSearch.tsx';
import { store } from './store/index.ts';

import type { VolumeLoaderManager } from '@utrad-ical/circus-ui-kit';
import {
  createVolumeLoaderManager,
  VolumeLoaderFactoryContext
} from '@utrad-ical/circus-ui-kit';
import type { ApiCaller } from '#utils/api.ts';
import { ApiContext } from '#utils/api.ts';
import loginManager, { LoginManagerContext } from '#utils/loginManager.ts';
import './styles/main.less';

const VolumeLoaderFactoryProvider: React.FC<{}> = ({ children }) => {
  const server = useSelector(state => state.loginUser.data?.dicomImageServer);
  // The session cookie authenticates both HTTP and WebSocket requests to RS
  const provider = useMemo<VolumeLoaderManager>(
    () => (server ? createVolumeLoaderManager({ server }) : (null as any)),
    [server]
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
  const isDarkMode = user && user.preferences.theme === 'mode_black';

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  return <RootApp manager={manager} />;
};

const TheApp: React.FC<{}> = () => {
  const [manager, setManager] = useState<ReturnType<typeof loginManager>>();
  const [api, setApi] = useState<ApiCaller>();

  useEffect(() => {
    // The login state is kept in the session cookie;
    // check it by loading the user information
    const manager = loginManager('/', store.dispatch, api =>
      setApi(() => api!)
    );
    setManager(manager);
    manager.refreshUserInfo(true);
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
