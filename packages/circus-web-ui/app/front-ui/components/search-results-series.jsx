import React from 'react';
import { SearchResults } from './search-results.jsx';
import { Button } from './react-bootstrap';
import { modal } from './modal.jsx';

const createCase = seriesUID => {
	modal.confirm('Add case for ' + seriesUID + '?').then(ans => {
		if (ans === true) {
			console.log('Add case ' + seriesUID);
		}
	});
};

const SeriesInfoRenderer = props => {
	function anon(item) {
		if (item) {
			return item;
		} else {
			return <span className="anonymized">(anonymized)</span>;
		}
	}

	// console.log(props);
	return <div className="search-result series">
		<div className="modality">{props.modality}</div>
		<div className="series-date">{props.seriesDate}</div>
		<div className="carete-time">{props.createTime}</div>
		<div className="series-description">{props.seriesDescription}</div>
		<div className="patient-id">
			{anon(props.patientInfo.patientID)}
		</div>
		<div className="patient-name">
			{anon(props.patientInfo.patientName)}
		</div>
		<div className="patient-age-sex">
			{anon(`${props.patientInfo.age} ${props.patientInfo.sex}`)}
		</div>
		<div className="register">
			<Button bsStyle="default"
				onClick={() => createCase(props.seriesUID)}
			>
				<span className="circus-icon circus-icon-series" />
				View
			</Button>
		</div>
	</div>;
};

const sortOptions = {
	'createTime asc': 'Create time asc',
	'createTime desc': 'Create time desc',
	'seriesUID asc': 'Series instance UID asc'
};

export const SeriesSearchResults = props => {
	return <SearchResults
		renderer={SeriesInfoRenderer}
		sortOptions={sortOptions}
		{...props}
	/>;
};
