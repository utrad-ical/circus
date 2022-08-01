import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Switch } from 'react-router-dom';
import Application from 'pages/Application';

import LoginScreen from 'pages/LoginScreen';
import OneTimeLogin from 'pages/OneTimeLogin';
import HomePage from 'pages/HomePage';
import SeriesSearch from 'pages/search/SeriesSearch';
import CreateNewCase from 'pages/CreateNewCase';
import CaseSearch from 'pages/search/CaseSearch';
import MySeriesList from 'pages/mylist/MySeriesList';
import MyCaseList from 'pages/mylist/MyCaseList';
import MyPluginJobList from 'pages/mylist/MyPluginJobList';
import CaseDetail from 'pages/case-detail/CaseDetail';
import CreateNewJob from 'pages/CreateNewJob';
import PluginJobSearch from 'pages/search/PluginJobSearch';
import ImportSeries from 'pages/ImportSeries';
import ImportCase from 'pages/ImportCase';
import SeriesDetail from 'pages/SeriesDetail';
import PluginJobDetail from 'pages/plugin-job-detail/PluginJobDetail';
import TaskList from 'pages/TaskList';
import AdminIndex from 'pages/admin/AdminIndex';
import GeneralAdmin from 'pages/admin/GeneralAdmin';
import GroupAdmin from 'pages/admin/GroupAdmin';
import UserAdmin from 'pages/admin/UserAdmin';
import ProjectAdmin from 'pages/admin/ProjectAdmin';
import PluginJobManagerAdmin from 'pages/admin/PluginJobManagerAdmin';
import PluginJobQueueAdmin from 'pages/admin/PluginJobQueueAdmin';
import PluginAdmin from 'pages/admin/PluginAdmin';
import Preferences from 'pages/Preferences';
import TokenManagement from 'pages/TokenManagement';

import { store } from './store';
import { Provider as ReduxStoreProvider, useSelector } from 'react-redux';
import { dismissMessageOnPageChange } from 'store/messages';
import PluginJobQueueSearch from './pages/search/PluginJobQueueSearch';
import browserHistory from './browserHistory';
import GlobalStyle, { CircusThemeProvider } from './theme';
import * as rs from '@utrad-ical/circus-rs/src/browser';

import { ApiContext, ApiCaller } from 'utils/api';
import loginManager, { LoginManagerContext } from 'utils/loginManager';
import { VolumeLoaderCacheContext } from 'utils/useImageSource';
import { VolumeLoaderFactoryContext } from 'utils/useVolumeLoader';
import createVolumeLoaderManager, { nullVolumeLoaderManager } from 'utils/createVolumeLoaderManager';

require('./styles/main.less');

require('bootstrap/fonts/glyphicons-halflings-regular.woff');
require('bootstrap/fonts/glyphicons-halflings-regular.woff2');
require('bootstrap/fonts/glyphicons-halflings-regular.ttf');

const AppRoutes: React.FC<{}> = () => {
  return (
    <Application>
      <Switch>
        <Route path="/home" component={HomePage} />
        <Route path="/plugin-job-queue" component={PluginJobQueueSearch} />
        <Route path="/import-series" component={ImportSeries} />
        <Route path="/import-case" component={ImportCase} />
        <Route path="/new-case/:seriesUid" component={CreateNewCase} />
        <Route path="/new-job/:seriesUid" component={CreateNewJob} />
        <Route path="/admin/general" component={GeneralAdmin} />
        <Route path="/admin/group" component={GroupAdmin} />
        <Route path="/admin/user" component={UserAdmin} />
        <Route path="/admin/project" component={ProjectAdmin} />
        <Route
          path="/admin/plugin-job-manager"
          component={PluginJobManagerAdmin}
        />
        <Route path="/admin/plugins" component={PluginAdmin} />
        <Route path="/admin/plugin-job-queue" component={PluginJobQueueAdmin} />
        <Route path="/admin" exact component={AdminIndex} />

        <Route
          path="/browse/series/mylist/:myListId?"
          component={MySeriesList}
        />
        <Route
          path="/browse/series/preset/:presetName"
          component={SeriesSearch}
        />
        <Route path="/series/:uid" component={SeriesDetail} />
        <Route path="/browse/series" component={SeriesSearch} />

        <Route path="/browse/case/mylist/:myListId?" component={MyCaseList} />
        <Route path="/browse/case/preset/:presetName" component={CaseSearch} />
        <Route path="/case/:caseId" component={CaseDetail} />
        <Route path="/browse/case" component={CaseSearch} />

        <Route
          path="/browse/plugin-jobs/mylist/:myListId?"
          component={MyPluginJobList}
        />
        <Route
          path="/browse/plugin-jobs/preset/:presetName"
          component={PluginJobSearch}
        />
        <Route path="/plugin-job/:jobId" component={PluginJobDetail} />
        <Route path="/browse/plugin-jobs" component={PluginJobSearch} />

        <Route path="/task-list" component={TaskList} />
        <Route path="/preference" component={Preferences} />
        <Route path="/tokens" component={TokenManagement} />
      </Switch>
    </Application>
  );
};

const VolumeLoaderFactoryProvider: React.FC<{ cacheTimeout?: number }> = ({ children, cacheTimeout = 5000 }) => {
  const server = useSelector(state => state.loginUser.data?.dicomImageServer);

  const provider = useMemo(() => {
    if (!server) return nullVolumeLoaderManager;

    return createVolumeLoaderManager({ server, cacheTimeout });
  }, [server, cacheTimeout]);

  return (
    <VolumeLoaderFactoryContext.Provider value={provider}>
      {children}
    </VolumeLoaderFactoryContext.Provider>
  );
};

/**
 * Provides a shared cache mechanism for volume loaders.
 */
const VolumeCacheProvider: React.FC = props => {
  const server = useSelector(state => state.loginUser.data?.dicomImageServer);

  const volumeLoaderCache = useMemo(() => {
    if (!server) return null;
    const rsHttpClient = new rs.RsHttpClient(server);
    return {
      rsHttpClient,
      map: new Map<string, rs.RsVolumeLoader>()
    };
  }, [server]);

  return (
    <VolumeLoaderCacheContext.Provider value={volumeLoaderCache}>
      {props.children}
    </VolumeLoaderCacheContext.Provider>
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

  useEffect(() => {
    // Handles history change
    browserHistory.listen(location => {
      // Hide message boxes which should not persist across page changes
      store.dispatch(dismissMessageOnPageChange());
      // Load user information again to check login status
      if (location.pathname !== '/') {
        manager?.refreshUserInfo(false);
      }
    });
  }, [manager]);

  if (!manager) return null;

  return (
    <LoginManagerContext.Provider value={manager}>
      <ApiContext.Provider value={api}>
        <ReduxStoreProvider store={store}>
          <VolumeLoaderFactoryProvider>
            <VolumeCacheProvider>
              <CircusThemeProvider>
                <GlobalStyle />
                <Router history={browserHistory}>
                  <Switch>
                    <Route exact path="/" component={LoginScreen} />
                    <Route exact path="/otp" component={OneTimeLogin} />
                    <AppRoutes />
                  </Switch>
                </Router>
              </CircusThemeProvider>
            </VolumeCacheProvider>
          </VolumeLoaderFactoryProvider>
        </ReduxStoreProvider>
      </ApiContext.Provider>
    </LoginManagerContext.Provider>
  );
};

ReactDOM.render(<TheApp />, document.getElementById('app'));
