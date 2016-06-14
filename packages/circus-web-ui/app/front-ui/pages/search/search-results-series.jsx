import React from 'react';
import { SearchResults } from './search-results';
import { Button } from 'components/react-bootstrap';
import { Link } from 'react-router';
import { modal } from 'components/modal';

async function createCase(seriesUID) {
	if (!(await modal.confirm('Add case for ' + seriesUID + '?'))) return;
	console.log('Add case ' + seriesUID);
};

export class SeriesSearchResults extends SearchResults {
	constructor(props) {
		super(props);
		const sortItems = {
			createTime: 'series import time',
			seriesUID: 'series instance UID',
			seriesDate: 'series date',
			modality: 'modality'
		};

		const sortOptions = {};
		Object.keys(sortItems).forEach(k => {
			sortOptions[`${k} asc`] = `${sortItems[k]} asc`;
			sortOptions[`${k} desc`] = `${sortItems[k]} desc`;
		});
		this.sortOptions = sortOptions;
	}

	renderItem(item) {
		function anon(item) {
			if (item) {
				return item;
			} else {
				return <span className="anonymized">(anonymized)</span>;
			}
		}

		return <div className="search-result series">
			<div className="modality">{item.modality}</div>
			<div className="series-date">{item.seriesDate}</div>
			<div className="carete-time">{item.createTime}</div>
			<div className="series-description">{item.seriesDescription}</div>
			<div className="patient-id">
				{anon(item.patientInfo.patientID)}
			</div>
			<div className="patient-name">
				{anon(item.patientInfo.patientName)}
			</div>
			<div className="patient-age-sex">
				{anon(`${item.patientInfo.age} ${item.patientInfo.sex}`)}
			</div>
			<div className="register">
				<Link to={`/series/${item.seriesUID}`}>
					<Button>
						<span className="circus-icon circus-icon-series" />
						View
					</Button>
				</Link>
			</div>
		</div>;
	}

};
