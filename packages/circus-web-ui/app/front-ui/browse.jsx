import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import { modalities } from './constants';
import { Router, Route, IndexRoute, browserHistory} from 'react-router';
import { api } from './utils/api';
import { App } from './components/app.jsx';
import { SeriesSearch } from './components/search-series.jsx';
import { CaseSearch } from './components/search-case.jsx';
import { ImportSeries } from './components/import-series.jsx';
import { AdminIndex } from './components/admin/index.jsx';
import { DicomImageServerAdmin } from './components/admin/dicom-image-server-admin.jsx';
import { StorageAdmin } from './components/admin/storage-admin.jsx';
import { GroupAdmin } from './components/admin/group-admin.jsx';
import { UserAdmin } from './components/admin/user-admin.jsx';
import { ProjectAdmin } from './components/admin/project-admin.jsx';
import * as modal from './components/modal.jsx';

require('style!css!./bs-style/bootstrap.less');
require('style!css!./components/components-style.less');

function render() {
	ReactDOM.render(
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
		</Router>,
		document.getElementById('app')
	);
}

render();
