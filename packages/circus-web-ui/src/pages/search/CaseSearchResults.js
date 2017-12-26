import React, { Fragment } from 'react';
import SearchResultsView, { makeSortOptions } from './SearchResultsView';
import { Button } from 'components/react-bootstrap';
import { Link } from 'react-router';
import DataGrid from 'components/DataGrid';
import PatientInfoBox from 'components/PatientInfoBox';
import ProjectDisplay from 'components/ProjectDisplay';
import ProjectTag from 'components/ProjectTag';
import TimeDisplay from 'components/TimeDisplay';

const Tags = props => {
  const item = props.value;
  return (
    <span className="tag-list">
      {item.tags.map(t => (
        <ProjectTag key={t} projectId={item.projectId} tag={t} />
      ))}
    </span>
  );
};

const Operation = props => {
  const item = props.value;
  return (
    <div className="register">
      <Link to={`/case/${item.caseId}`}>
        <Button bsSize="sm" bsStyle="primary">
          <span className="circus-icon circus-icon-case" />
          View
        </Button>
      </Link>
    </div>
  );
};

const Project = props => {
  const item = props.value;
  return <ProjectDisplay projectId={item.projectId} size="xl" withName />;
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
      return <PatientInfoBox value={patientInfoCache} />;
    }
  },
  {
    caption: 'Create/Update',
    className: 'created-at',
    renderer: props => (
      <Fragment>
        <TimeDisplay value={props.value.createdAt} />
        <br />
        <TimeDisplay value={props.value.updatedAt} />
      </Fragment>
    )
  },
  { caption: 'Tags', className: 'tags', renderer: Tags },
  { caption: '', className: 'operation', renderer: Operation }
];

const DataView = props => {
  const { value } = props;
  return (
    <DataGrid
      className="series-search-result"
      columns={columns}
      value={value}
    />
  );
};

const sortOptions = makeSortOptions({
  createdAt: 'case create time',
  updatedAt: 'case updated time',
  projectId: 'project'
});

const CaseSearchResultsView = props => {
  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      name="case"
    />
  );
};

export default CaseSearchResultsView;
