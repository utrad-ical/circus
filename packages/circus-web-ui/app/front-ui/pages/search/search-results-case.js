import React from 'react';
import { SearchResultsView } from './search-results';
import { Button } from 'components/react-bootstrap';
import { Link } from 'react-router';
// import { Tag } from 'components/tag';
import { connect } from 'react-redux';

class CaseSearchResultsView extends SearchResultsView {
	constructor(props) {
		super(props);
		this.makeSortOptions({
			createTime: 'series import time',
			projectID: 'project'
		});
	}

	renderItem(item) {
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
	}

}

export const CaseSearchResults = connect(
	state => {
		const name = 'case';
		const search = state.searches[name] || {};
		return { ...search, name };
	}
)(CaseSearchResultsView);
