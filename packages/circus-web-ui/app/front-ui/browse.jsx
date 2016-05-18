import React from 'react';
import ReactDOM from 'react-dom';
import { SeriesSearchCondition } from './components/search-condition-series.jsx';
import { modalities } from './constants';
import { api } from './utils/api';

require('style!css!./bs-style/bootstrap.less');
require('style!css!./components/components-style.less');

let store = {
	seriesCondition: {
		projects: ['lung'],
		type: 'advanced',
		basicFilter: { modality: 'all', sex: 'all' },
		advancedFilter: { $and: [ { age: 100 } ] }
	},
	projectList: {}
};

const conditionChange = newCondition => {
	store.seriesCondition = newCondition;
	render();
};

const keys = {
	age: { caption: 'Age', type: 'number' },
	salary: { caption: 'Salary', type: 'number' },
	name: { caption: 'Name', type: 'text' },
	address: { caption: 'Address', type: 'text' },
	sex: { caption: 'Sex', type: 'select', spec: { options: ['M', 'F', 'O'] } },
	modality: { caption: 'Modality', type: 'select', spec: { options: modalities }}
};

function render() {
	ReactDOM.render(
		<SeriesSearchCondition condition={store.seriesCondition}
			projects={store.projectList}
			keys={keys}
			onChange={conditionChange} />,
		document.getElementById('app')
	);
}

api('project').then(list => {
	const projects = {};
	list.forEach(p => projects[p.projectID] = p.projectName);
	store.projectList = projects;
	render();
});

render();
