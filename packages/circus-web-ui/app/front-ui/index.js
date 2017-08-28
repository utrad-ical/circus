// Build CSS from LESS.
// This CSS is not intended to be used in the SPA version;
// we just build this for the legacy version.
require('file-loader?name=css/style.css!../assets/less/style.less');

// Babel polyfill, needed for async/await and Promise support for IE
import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import { App } from 'pages/app';
import { LoginScreen } from 'pages/login-screen';
import { Home } from 'pages/home';

import SeriesSearch from 'pages/search/SeriesSearch';
import CaseSearch from 'pages/search/CaseSearch';

import { CaseDetail } from 'pages/case-detail/case-detail';
import { ImportSeries } from 'pages/import-series';
import { ImportCase} from 'pages/import-case';
import { SeriesDetail } from 'pages/series-detail';
import { TaskList } from 'pages/task-list';

import AdminIndex from 'pages/admin/AdminIndex';
import AdminContainer from 'pages/admin/AdminContainer';
import GeneralAdmin from 'pages/admin/GeneralAdmin';
import DicomImageServerAdmin from 'pages/admin/DicomImageServerAdmin';
import StorageAdmin from 'pages/admin/StorageAdmin';
import GroupAdmin from 'pages/admin/GroupAdmin';
import UserAdmin from 'pages/admin/UserAdmin';
import ProjectAdmin from 'pages/admin/ProjectAdmin';

import Preferences from 'pages/Preferences';

import { store } from 'store';
import { Provider } from 'react-redux';
import { refreshUserInfo, dismissMessageOnPageChange } from 'actions';

require('./styles/main.less');

require('bootstrap/fonts/glyphicons-halflings-regular.woff');
require('bootstrap/fonts/glyphicons-halflings-regular.woff2');
require('bootstrap/fonts/glyphicons-halflings-regular.ttf');

ReactDOM.render(
	<Provider store={store}>
		<Router history={browserHistory}>
			<Route path='/' component={LoginScreen} onLeave={leaveLoginScreen} />
			<Route path='/' component={App} onChange={pageMove}>
				<Route path='home' component={Home} />
				<Route path='browse/series' component={SeriesSearch} />
				<Route path='browse/case' component={CaseSearch} />
				<Route path='import-series' component={ImportSeries} />
				<Route path='import-case' component={ImportCase} />
				<Route path='admin' component={AdminContainer}>
					<IndexRoute component={AdminIndex} />
					<Route path='general' component={GeneralAdmin} />
					<Route path='server' component={DicomImageServerAdmin} />
					<Route path='storage' component={StorageAdmin} />
					<Route path='group' component={GroupAdmin} />
					<Route path='user' component={UserAdmin} />
					<Route path='project' component={ProjectAdmin} />
				</Route>
				<Route path='series/:uid' component={SeriesDetail} />
				<Route path='case/:cid' component={CaseDetail} />
				<Route path='task-list' component={TaskList} />
				<Route path='preference' component={Preference} />
			</Route>
		</Router>
	</Provider>,
	document.getElementById('app')
);

// First-time login check
refreshUserInfo(true);

function leaveLoginScreen() {
	refreshUserInfo(true);
	dismissMessageOnPageChange();
}

function pageMove() {
	// Hide message boxes which should not persist upon page changes
	dismissMessageOnPageChange();
	// Load user information again to check login status
	refreshUserInfo(false);
}
