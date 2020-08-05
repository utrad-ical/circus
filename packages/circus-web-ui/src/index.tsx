// Babel polyfill, needed for async/await and Promise support for IE
import '@babel/polyfill';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Switch } from 'react-router-dom';
import Application from 'pages/Application';

import LoginScreen from 'pages/LoginScreen';
import HomePage from 'pages/HomePage';
import SeriesSearch from 'pages/search/SeriesSearch';
import CreateNewCase from 'pages/CreateNewCase';
import CaseSearch from 'pages/search/CaseSearch';
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

import { store } from './store';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import tinycolor from 'tinycolor2';
import { dismissMessageOnPageChange } from 'store/messages';
import PluginJobQueueSearch from './pages/search/PluginJobQueueSearch';
import browserHistory from 'browserHistory';

import { ApiContext, ApiCaller } from 'utils/api';
import loginManager, { LoginManagerContext } from 'utils/loginManager';

require('./styles/main.less');

require('bootstrap/fonts/glyphicons-halflings-regular.woff');
require('bootstrap/fonts/glyphicons-halflings-regular.woff2');
require('bootstrap/fonts/glyphicons-halflings-regular.ttf');

const theme = {
  brandPrimary: '#168477',
  brandDark: tinycolor('#168477').darken(10).toString(),
  brandDarker: tinycolor('#168477').darken(20).toString(),
  highlightColor: '#fd3164'
};

const AppRoutes: React.FC<{}> = () => {
  return (
    <Application>
      <Route path="/home" component={HomePage} />
      <Route path="/browse/series/:presetName?" component={SeriesSearch} />
      <Route path="/browse/case/:presetName?" component={CaseSearch} />
      <Route
        path="/browse/plugin-jobs/:presetName?"
        component={PluginJobSearch}
      />
      <Route path="/plugin-job-queue" component={PluginJobQueueSearch} />
      <Route path="/import-series" component={ImportSeries} />
      <Route path="/import-case" component={ImportCase} />
      <Route path="/new-case/:seriesUid" component={CreateNewCase} />
      <Route path="/new-job/:seriesUid" component={CreateNewJob} />
      <Switch>
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
      </Switch>
      <Route path="/series/:uid" component={SeriesDetail} />
      <Route path="/case/:caseId" component={CaseDetail} />
      <Route path="/plugin-job/:jobId" component={PluginJobDetail} />
      <Route path="/task-list" component={TaskList} />
      <Route path="/preference" component={Preferences} />
    </Application>
  );
};

const TheApp: React.FC<{}> = () => {
  const [manager, setManager] = useState<ReturnType<typeof loginManager>>();
  const [api, setApi] = useState<ApiCaller>();

  useEffect(() => {
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
    browserHistory.listen(() => {
      // Hide message boxes which should not persist upon page changes
      store.dispatch(dismissMessageOnPageChange());
      // Load user information again to check login status
      manager && manager.refreshUserInfo(false);
    });
  });

  if (!manager) return null;

  return (
    <LoginManagerContext.Provider value={manager}>
      <ApiContext.Provider value={api}>
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <Router history={browserHistory}>
              <Switch>
                <Route exact path="/" component={LoginScreen} />
                <AppRoutes />
              </Switch>
            </Router>
          </ThemeProvider>
        </Provider>
      </ApiContext.Provider>
    </LoginManagerContext.Provider>
  );
};

ReactDOM.render(<TheApp />, document.getElementById('app'));
