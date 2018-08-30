// Babel polyfill, needed for async/await and Promise support for IE
import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import Application from 'pages/Application';
import LoginScreen from 'pages/LoginScreen';
import HomePage from 'pages/HomePage';

import SeriesSearch from 'pages/search/SeriesSearch';
import CreateNewCase from 'pages/CreateNewCase';
import CaseSearch from 'pages/search/CaseSearch';
import CaseDetail from 'pages/case-detail/CaseDetail';
import PluginJobSearch from 'pages/search/PluginJobSearch';
import ImportSeries from 'pages/ImportSeries';
import ImportCase from 'pages/ImportCase';
import SeriesDetail from 'pages/SeriesDetail';
import TaskList from 'pages/TaskList';
import AdminIndex from 'pages/admin/AdminIndex';
import GeneralAdmin from 'pages/admin/GeneralAdmin';
import GroupAdmin from 'pages/admin/GroupAdmin';
import UserAdmin from 'pages/admin/UserAdmin';
import ProjectAdmin from 'pages/admin/ProjectAdmin';
import PluginJobManagerAdmin from 'pages/admin/PluginJobManagerAdmin';
import PluginAdmin from 'pages/admin/PluginAdmin';
import Preferences from 'pages/Preferences';

import { store } from 'store';
import { Provider } from 'react-redux';
import { refreshUserInfo, dismissMessageOnPageChange } from 'actions';
import PluginJobQueueSearch from './pages/search/PluginJobQueueSearch';

require('./styles/main.less');

require('bootstrap/fonts/glyphicons-halflings-regular.woff');
require('bootstrap/fonts/glyphicons-halflings-regular.woff2');
require('bootstrap/fonts/glyphicons-halflings-regular.ttf');

ReactDOM.render(
  <Provider store={store}>
    <Router history={browserHistory}>
      <Route path="/" component={LoginScreen} onLeave={leaveLoginScreen} />
      <Route path="/" component={Application} onChange={pageMove}>
        <Route path="home" component={HomePage} />
        <Route path="browse/series(/:presetName)" component={SeriesSearch} />
        <Route path="browse/case(/:presetName)" component={CaseSearch} />
        <Route
          path="browse/plugin-jobs(/:presetName)"
          component={PluginJobSearch}
        />
        <Route path="plugin-job-queue" component={PluginJobQueueSearch} />
        <Route path="import-series" component={ImportSeries} />
        <Route path="import-case" component={ImportCase} />
        <Route path="new-case/:uid" component={CreateNewCase} />
        <Route path="admin">
          <IndexRoute component={AdminIndex} />
          <Route path="general" component={GeneralAdmin} />
          <Route path="group" component={GroupAdmin} />
          <Route path="user" component={UserAdmin} />
          <Route path="project" component={ProjectAdmin} />
          <Route path="plugin-job-manager" component={PluginJobManagerAdmin} />
          <Route path="plugins" component={PluginAdmin} />
        </Route>
        <Route path="series/:uid" component={SeriesDetail} />
        <Route path="case/:caseId" component={CaseDetail} />
        <Route path="task-list" component={TaskList} />
        <Route path="preference" component={Preferences} />
      </Route>
    </Router>
  </Provider>,
  document.getElementById('app')
);

// First-time login check
store.dispatch(refreshUserInfo(true));

function leaveLoginScreen() {
  store.dispatch(refreshUserInfo(true));
  dismissMessageOnPageChange();
}

function pageMove() {
  // Hide message boxes which should not persist upon page changes
  dismissMessageOnPageChange();
  // Load user information again to check login status
  store.dispatch(refreshUserInfo(false));
}
