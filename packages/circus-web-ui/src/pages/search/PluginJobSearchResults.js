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
    renderer: ({ value: { pluginId } }) => {
      return (
        <PluginDisplay
          size="xl"
          plugin={{
            pluginName: 'MRA-CAD',
            version: '1.5',
            icon: {
              glyph: 'brain',
              color: '#ff5500',
              backgroundColor: '#ccffaa'
            }
          }}
        />
      );
    }
  },
  {
    caption: 'Executed by',
    key: 'userEmail'
  },
  {
    caption: 'Execution Time',
    className: 'executoin-time',
    renderer: props => <TimeDisplay value={props.value.startedAt} />
  },
  {
    caption: 'Status',
    className: 'created-at',
    renderer: props => <Fragment>{props.value.status}</Fragment>
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
