import React from 'react';
import ReactDOM from 'react-dom';
import { SeriesSearchCondition } from './components/search-condition-series.jsx';
import { SeriesSearchResults } from './components/search-results-series.jsx';
import { modalities } from './constants';
import { api } from './utils/api';
import * as modal from './components/modal.jsx';

require('style!css!./bs-style/bootstrap.less');
require('style!css!./components/components-style.less');

let store = {
	seriesCondition: {
		projects: [],
		type: 'basic',
		basicFilter: {},
		advancedFilter: { $and: [] }
	},
	projectList: [],
	seriesSearchResults: null
};

const conditionChange = newCondition => {
	store.seriesCondition = newCondition;
	render();
};

const search = condition => {
	const params = { data: { filter: condition } };
	api('series', params).then(results => {
		console.log(results);
		store.seriesSearchResults = results;
		render();
	});
};

function render() {
	ReactDOM.render(
		<div>
			<SeriesSearchCondition condition={store.seriesCondition}
				projects={store.projectList}
				onSearch={search}
				onChange={conditionChange} />
			{ Array.isArray(store.seriesSearchResults) ?
				<SeriesSearchResults items={store.seriesSearchResults} />
			: null }
		</div>,
		document.getElementById('app')
	);
}

api('project').then(list => {
	const projectList = {};
	list.forEach(p => projectList[p.projectID] = p);
	store.projectList = projectList;
	render();
});

render();
