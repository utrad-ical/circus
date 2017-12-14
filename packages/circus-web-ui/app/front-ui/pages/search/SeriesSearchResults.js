import React from 'react';
import SearchResultsView, { makeSortOptions } from './SearchResultsView';
import { Button } from 'components/react-bootstrap';
import { Link } from 'react-router';
import { connect } from 'react-redux';

/*
async function createCase(seriesUID) {
	if (!(await modal.confirm('Add case for ' + seriesUID + '?'))) return;
	// console.log('Add case ' + seriesUID);
}
*/

const DataViewRow = props => {
	function anon(item) {
		if (item) {
			return item;
		} else {
			return <span className='anonymized'>(anonymized)</span>;
		}
	}

	const { item } = props;

	return <div className='search-result series'>
		<div className='modality'>{item.modality}</div>
		<div className='series-date'>{item.seriesDate}</div>
		<div className='create-time'>{item.createTime}</div>
		<div className='series-description'>{item.seriesDescription}</div>
		<div className='patient-id'>
			{anon(item.patientInfo.patientID)}
		</div>
		<div className='patient-name'>
			{anon(item.patientInfo.patientName)}
		</div>
		<div className='patient-age-sex'>
			{anon(`${item.patientInfo.age} ${item.patientInfo.sex}`)}
		</div>
		<div className='register'>
			<Link to={`/series/${item.seriesUid}`}>
				<Button>
					<span className='circus-icon circus-icon-series' />
					View
				</Button>
			</Link>
			<Link to={`/new-case/${item.seriesUid}`}>
				<Button>
					<span className='circus-icon circus-icon-case' />
					Create Case
				</Button>
			</Link>
		</div>
	</div>;
};

const DataView = props => {
	const { items } = props;
	return <div className='search-results'>{items.map(
		item => <DataViewRow key={item.seriesUid} item={item} />
	)}</div>;
};

const sortOptions = makeSortOptions({
	createdAt: 'series import time',
	seriesUid: 'series instance UID',
	seriesDate: 'series date',
	modality: 'modality'
});

const SeriesSearchResultsView = props => {
	return <SearchResultsView
		sortOptions={sortOptions}
		dataView={DataView}
		{...props}
	/>;
};

export default connect(
	state => {
		const search = state.searches.series || {};
		return { ...search, name: 'series' };
	}
)(SeriesSearchResultsView);
