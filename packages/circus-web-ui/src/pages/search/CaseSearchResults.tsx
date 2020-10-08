import React, { Fragment } from 'react';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import { Link } from 'react-router-dom';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import PatientInfoBox from 'components/PatientInfoBox';
import ProjectDisplay from 'components/ProjectDisplay';
import { TagList } from 'components/Tag';
import TimeDisplay from 'components/TimeDisplay';
import IconButton from 'components/IconButton';

const Operation: React.FC<{
  value: any;
}> = props => {
  const item = props.value;
  return (
    <div className="register">
      <Link to={`/case/${item.caseId}`}>
        <IconButton icon="circus-case" bsSize="sm" bsStyle="primary">
          View
        </IconButton>
      </Link>
    </div>
  );
};

const Project: React.FC<{
  value: any;
}> = props => {
  const item = props.value;
  return <ProjectDisplay projectId={item.projectId} size="xl" withName />;
};

const CaseId: React.FC<{
  value: any;
}> = props => {
  const item = props.value;
  return <Fragment>{item.caseId.substr(0, 8)}</Fragment>;
};

const columns: DataGridColumnDefinition<any>[] = [
  { caption: 'Project', className: 'project', renderer: Project },
  { caption: 'Case ID', className: 'caseId', renderer: CaseId },
  {
    caption: 'Patient',
    className: 'patient',
    renderer: ({ value: { patientInfo } }) => {
      return <PatientInfoBox value={patientInfo} />;
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
  {
    caption: 'Tags',
    className: 'tags',
    renderer: ({ value: item }) => {
      return <TagList tags={item.tags} projectId={item.projectId} />;
    }
  },
  { caption: '', className: 'operation', renderer: Operation }
];

const DataView: React.FC<{ value: any[] }> = props => {
  const { value } = props;
  return (
    <DataGrid
      className="case-search-result"
      itemPrimaryKey="caseId"
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

const CaseSearchResultsView: React.FC<{}> = props => {
  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable
      name="case"
    />
  );
};

export default CaseSearchResultsView;
