import React from 'react';
import ReactDOM from 'react-dom';
import { modalities } from './constants';
import { Router, Route, browserHistory} from 'react-router';
import { api } from './utils/api';
import { App } from './components/app.jsx';
import { SeriesSearch } from './components/search-series.jsx';
import { CaseSearch } from './components/search-case.jsx';
import * as modal from './components/modal.jsx';

require('style!css!./bs-style/bootstrap.less');
require('style!css!./components/components-style.less');

function render() {
	ReactDOM.render(
		<Router history={browserHistory}>
			<Route path='/' component={App}>
				<Route path='/browse-series' component={SeriesSearch} />
				<Route path='/browse-case' component={CaseSearch} />
			</Route>
		</Router>,
		document.getElementById('app')
	);
}

render();
