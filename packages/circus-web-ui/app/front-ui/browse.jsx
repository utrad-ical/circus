import React from 'react';
import ReactDOM from 'react-dom';
import { SeriesSearchCondition } from './components/search-condition-series.jsx';
import { modalities } from './constants';
import { api } from './utils/api';

require('style!css!./bs-style/bootstrap.less');
require('style!css!./components/components-style.less');

let store = {
	seriesCondition: {
		projects: [],
		type: 'basic',
		basicFilter: {},
		advancedFilter: { $and: [] }
	},
	projectList: []
};

const conditionChange = newCondition => {
	store.seriesCondition = newCondition;
	render();
};

function render() {
	ReactDOM.render(
		<div>
			<SeriesSearchCondition condition={store.seriesCondition}
				projects={store.projectList}
				onChange={conditionChange} />
			<div>{JSON.stringify(store.seriesCondition)}</div>
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
