import React, { Fragment } from 'react';
import SearchResultsView, { makeSortOptions } from './SearchResultsView';
import { Button } from 'components/react-bootstrap';
import { Link } from 'react-router';
// import { Tag } from 'components/tag';
import { connect } from 'react-redux';
import DataGrid from 'components/DataGrid';
import PatientInfoBox from 'pages/search/PatientInfoBox';
import ProjectDisplay from 'components/ProjectDisplay';
import ProjectTag from 'components/ProjectTag';

const Tags = props => {
	const item = props.value;
	return (
		<span>
			{item.tags.map(t => (
				<ProjectTag key={t} projectId={item.projectId} tag={t} />
			))}
		</span>
	);
};

const Operation = props => {
	const item = props.value;
	return (
		<div className='register'>
			<Link to={`/case/${item.caseId}`}>
				<Button bsSize='sm' bsStyle='primary'>
					<span className='circus-icon circus-icon-case' />
					View
				</Button>
			</Link>
		</div>
	);
};

const Project = props => {
	const item = props.value;
	return <ProjectDisplay projectId={item.projectId} size='xl' withName />;
};

const CaseId = props => {
	const item = props.value;
	return <Fragment>{item.caseId.substr(0, 8)}</Fragment>;
};

const columns = [
	{ caption: 'Project', className: 'project', renderer: Project },
	{ caption: 'Case ID', className: 'caseId', renderer: CaseId },
	{
		caption: 'Patient',
		className: 'patient',
		renderer: ({ value: { patientInfoCache } }) => {
			return <PatientInfoBox value={{ patientInfo: patientInfoCache }} />;
		}
	},
	{ caption: 'Create Time', key: 'createdAt' },
	{ caption: 'Tags', className: 'tags', renderer: Tags },
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
	createTime: 'series import time',
	projectID: 'project'
});

const CaseSearchResultsView = props => {
	return (
		<SearchResultsView
			sortOptions={sortOptions}
			dataView={DataView}
			{...props}
		/>
	);
};

export default connect(state => {
	const search = state.searches.case || {};
	return { ...search, name: 'case' };
})(CaseSearchResultsView);
