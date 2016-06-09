// Build CSS from LESS.
// This CSS is not intended to be used in the SPA version;
// we just build this for the legacy version.
require('file?name=css/style.css!../assets/less/style.less');

// Babel polyfill, needed for async/await and Promise support for IE
import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory} from 'react-router';
import { api } from 'utils/api';
import { App } from 'pages/app';
import { LoginScreen } from 'pages/login-screen';
import { Home } from 'pages/home';
import { SeriesSearch } from 'pages/search-series';
import { CaseSearch } from 'pages/search-case';
import { CaseDetail } from 'pages/case-detail';
import { ImportSeries } from 'pages/import-series';
import { SeriesDetail} from 'pages/series-detail';
import { TaskList } from 'pages/task-list';
import { AdminIndex } from 'pages/admin/index';
import { AdminContainer } from 'pages/admin/admin-container';
import { GeneralAdmin } from 'pages/admin/general-admin';
import { DicomImageServerAdmin } from 'pages/admin/dicom-image-server-admin';
import { StorageAdmin } from 'pages/admin/storage-admin';
import { GroupAdmin } from 'pages/admin/group-admin';
import { UserAdmin } from 'pages/admin/user-admin';
import { ProjectAdmin } from 'pages/admin/project-admin';
import { Preference } from 'pages/preference';

import { store } from 'store';
import { Provider } from 'react-redux';
import { refreshUserInfo } from 'actions';

require('style!css!./styles/main.less');
require('bootstrap/fonts/glyphicons-halflings-regular.woff');
require('bootstrap/fonts/glyphicons-halflings-regular.woff2');
require('bootstrap/fonts/glyphicons-halflings-regular.ttf');

ReactDOM.render(
	<Provider store={store}>
		<Router history={browserHistory}>
			<Route path='/' component={LoginScreen} onLeave={() => refreshUserInfo(true)} />
			<Route path='/' component={App} onChange={pageMove}>
				<Route path="home" component={Home} />
				<Route path='browse/series' component={SeriesSearch} />
				<Route path='browse/case' component={CaseSearch} />
				<Route path='import-series' component={ImportSeries} />
				<Route path='admin' component={AdminContainer}>
					<IndexRoute component={AdminIndex} />
					<Route path='general' component={GeneralAdmin} />
					<Route path='server' component={DicomImageServerAdmin} />
					<Route path='storage' component={StorageAdmin} />
					<Route path='group' component={GroupAdmin} />
					<Route path='user' component={UserAdmin} />
					<Route path='project' component={ProjectAdmin} />
				</Route>
				<Route path="series/:uid" component={SeriesDetail} />
				<Route path="case/:id" component={CaseDetail} />
				<Route path="task-list" component={TaskList} />
				<Route path='preference' component={Preference} />
			</Route>
		</Router>
	</Provider>,
	document.getElementById('app')
);

// First-time login check
refreshUserInfo(true);

function pageMove() {
	refreshUserInfo(false);
}
