import React from 'react';
import SearchResultsView, { makeSortOptions } from './SearchResultsView';
import { Button } from 'components/react-bootstrap';
import { Link } from 'react-router';
// import { Tag } from 'components/tag';
import { connect } from 'react-redux';

const DataViewRow = props => {
	const { item } = props;
	function anon(item) {
		if (item) {
			return item;
		} else {
			return <span className='anonymized'>(anonymized)</span>;
		}
	}

	return <div className='search-result series'>
		<div className='project-name'>{item.projectID}</div>
		<div className='carete-time'>{item.createTime}</div>
		<div className='patient-id'>
			{anon(item.patientInfoCache.patientID)}
		</div>
		<div className='patient-name'>
			{anon(item.patientInfoCache.patientName)}
		</div>
		<div className='tags'>
			{Array.isArray(item.tags) ? item.tags.map((t, i) => (
				<span key={i} className='label label-default'>{t}</span>
			)) : null}
		</div>
		<div className='register'>
			<Link to={`/case/${item.caseID}`}>
				<Button>
					<span className='circus-icon circus-icon-case' />
					View
				</Button>
			</Link>
		</div>
	</div>;
};

const DataView = props => {
	const { items } = props;
	return <div className='search-results'>{items.map(
		item => <DataViewRow key={item.caseId} item={item} />
	)}</div>;
};

const sortOptions = makeSortOptions({
	createTime: 'series import time',
	projectID: 'project'
});

const CaseSearchResultsView = props => {
	return <SearchResultsView
		sortOptions={sortOptions}
		dataView={DataView}
		{...props}
	/>;
};

export default connect(
	state => {
		const search = state.searches.case || {};
		return { ...search, name: 'case' };
	}
)(CaseSearchResultsView);
