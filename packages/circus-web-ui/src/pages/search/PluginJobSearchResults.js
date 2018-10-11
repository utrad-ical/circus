import React from 'react';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import DataGrid from 'components/DataGrid';
import PatientInfoBox from 'components/PatientInfoBox';
import TimeDisplay from 'components/TimeDisplay';
import PluginDisplay from 'components/PluginDisplay';
import IconButton from 'components/IconButton';
import { ProgressBar } from 'components/react-bootstrap';
import browserHistory from 'browserHistory';

const Operation = props => {
  const { value: job } = props;

  const handleClick = () => {
    if (job.status !== 'finished') return;
    const url = `/plugin-job/${job.jobId}`;
    browserHistory.push(url);
  };

  return (
    <IconButton
      disabled={job.status !== 'finished'}
      icon="circus-series"
      bsSize="sm"
      bsStyle="primary"
      onClick={handleClick}
    >
      View
    </IconButton>
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
    className: 'status',
    renderer: ({ value: { status } }) => {
      if (status === 'processing') {
        return (
          <ProgressBar
            active
            stripped
            bsStyle="info"
            now={100}
            label="processing"
          />
        );
      }
      const className = {
        in_queue: 'text-info',
        finished: 'text-success',
        processing: 'text-primary',
        invalidated: 'text-muted'
      }[status];
      return <span className={className || 'text-danger'}>{status}</span>;
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
