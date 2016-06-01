// Build CSS from LESS.
// This CSS is not intended to be used in the SPA version;
// we just build this for the legacy version.
require('file?name=css/style.css!../assets/less/style.less');

// Babel polyfill, needed for async/await and Promise support for IE
import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import { modalities } from 'constants';
import { Router, Route, IndexRoute, browserHistory} from 'react-router';
import { api } from 'utils/api';
import { App } from 'components/app';
import { SeriesSearch } from 'components/search-series';
import { CaseSearch } from 'components/search-case';
import { ImportSeries } from 'components/import-series';
import { AdminIndex } from 'components/admin/index';
import { DicomImageServerAdmin } from 'components/admin/dicom-image-server-admin';
import { StorageAdmin } from 'components/admin/storage-admin';
import { GroupAdmin } from 'components/admin/group-admin';
import { UserAdmin } from 'components/admin/user-admin';
import { ProjectAdmin } from 'components/admin/project-admin';
import * as modal from 'components/modal';

import { store } from 'store';
import { Provider } from 'react-redux';

require('style!css!./bs-style/bootstrap.less');
require('style!css!./components/components-style.less');

ReactDOM.render(
	<Provider store={store}>
		<Router history={browserHistory}>
			<Route path='/' component={App}>
				<Route path='browse/series' component={SeriesSearch} />
				<Route path='browse/case' component={CaseSearch} />
				<Route path='import-series' component={ImportSeries} />
				<Route path='admin'>
					<IndexRoute component={AdminIndex} />
					<Route path='server' component={DicomImageServerAdmin} />
					<Route path='storage' component={StorageAdmin} />
					<Route path='group' component={GroupAdmin} />
					<Route path='user' component={UserAdmin} />
					<Route path='project' component={ProjectAdmin} />
				</Route>
			</Route>
		</Router>
	</Provider>,
	document.getElementById('app')
);

async function loadUserInfo() {
	const result = await api('login-info');
	store.dispatch({
		type: 'LOAD_LOGIN_INFO',
		loginUser: result.loginUser
	});
}
loadUserInfo();
