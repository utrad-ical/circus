import React, { Fragment } from 'react';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import { Link } from 'react-router-dom';
import DataGrid from 'components/DataGrid';
import PatientInfoBox from 'components/PatientInfoBox';
import TimeDisplay from 'components/TimeDisplay';
import PluginDisplay from 'components/PluginDisplay';
import IconButton from 'components/IconButton';

const Operation = props => {
  const { value: series } = props;
  return (
    <Fragment>
      <Link to={`/plugin-job/${series.jobId}`}>
        <IconButton icon="circus-series" bsSize="sm">
          View
        </IconButton>
      </Link>
    </Fragment>
  );
};

const PluginRenderer = props => {
  const { value: { pluginId } } = props;
  return <PluginDisplay size="lg" pluginId={pluginId} />;
};

const columns = [
  {
    caption: 'Patient',
    className: 'patient',
    renderer: ({ value: { patientInfo } }) => {
      return <PatientInfoBox value={patientInfo} />;
    }
  },
  {
    caption: 'Plugin',
    className: 'plugin',
    renderer: PluginRenderer
  },
  {
    caption: 'Executed by',
    renderer: ({ value: { userEmail } }) => {
      return userEmail.slice(0, 10) + '...';
    }
  },
  {
    caption: 'Execution Time',
    className: 'executoin-time',
    renderer: props => <TimeDisplay value={props.value.startedAt} />
  },
  {
    caption: 'Status',
    className: 'created-at',
    renderer: ({ value: { status } }) => {
      const className = status === 'finished' ? 'text-success' : '';
      return <span className={className}>{status}</span>;
    }
  },
  { caption: '', className: 'operation', renderer: Operation }
];

const DataView = props => {
  const { value } = props;
  return (
    <DataGrid
      className="plugin-job-search-result"
      columns={columns}
      value={value}
    />
  );
};

const sortOptions = makeSortOptions({
  createdAt: 'job date'
});

const PluginSearchResults = props => {
  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable
      name="pluginJobs"
    />
  );
};

export default PluginSearchResults;
