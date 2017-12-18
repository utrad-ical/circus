import React, { Fragment } from 'react';
import SearchResultsView, { makeSortOptions } from './SearchResultsView';
import { Button } from 'components/react-bootstrap';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import DataGrid from 'components/DataGrid';

const Modality = props => {
	const series = props.value;
	return <span className='label label-default'>{series.modality}</span>;
};

const Patient = props => {
	const { patientInfo: pt } = props.value;
	if (!pt) {
		return <span className='patient-info-masked'>(masked)</span>;
	}
	return (
		<div className='patient-info-box'>
			<div>
				<span className='patient-name'>{pt.patientName}</span>&ensp;
				<span className='patient-age'>{pt.age}</span>
				<span className='patient-sex'>{pt.sex}</span>
			</div>
			<div className='sub'>
				<span className='patient-id'>{pt.patientId}</span>
				<span className='patient-birthdate'>{pt.birthDate}</span>
				{pt.size > 0 && (
					<Fragment>
						&ensp;<span className='patient-size'>
							&ensp;Ht: {pt.size}
						</span>
					</Fragment>
				)}
				{pt.weight > 0 && (
					<Fragment>
						&ensp;<span className='patient-weight'>
							&ensp;Wt: {pt.weight}
						</span>
					</Fragment>
				)}
			</div>
		</div>
	);
};

const Operation = props => {
	const { value: series } = props;
	return (
		<Fragment>
			<Link to={`/series/${series.seriesUid}`}>
				<Button bsSize='sm'>
					<span className='circus-icon circus-icon-series' />
					View
				</Button>
			</Link>
			&thinsp;
			<Link to={`/new-case/${series.seriesUid}`}>
				<Button bsStyle='primary' bsSize='sm'>
					<span className='circus-icon circus-icon-case' />
					New
				</Button>
			</Link>
		</Fragment>
	);
};

const columns = [
	{ caption: '', className: 'modality', renderer: Modality },
	{ caption: 'Patient', className: 'patient', renderer: Patient },
	{ caption: 'Series Desc', key: 'seriesDescription' },
	{ caption: 'Series Date', key: 'seriesDate' },
	{ caption: 'Import date', key: 'createdAt' },
	{ caption: '', className: 'operation', renderer: Operation }
];

const DataView = props => {
	const { items } = props;
	return (
		<DataGrid
			className='series-search-result'
			columns={columns}
			value={items}
		/>
	);
};

const sortOptions = makeSortOptions({
	createdAt: 'series import time',
	seriesUid: 'series instance UID',
	seriesDate: 'series date',
	modality: 'modality'
});

const SeriesSearchResultsView = props => {
	return (
		<SearchResultsView
			sortOptions={sortOptions}
			dataView={DataView}
			{...props}
		/>
	);
};

export default connect(state => {
	const search = state.searches.series || {};
	return { ...search, name: 'series' };
})(SeriesSearchResultsView);
