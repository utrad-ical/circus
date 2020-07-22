import React, { Fragment } from 'react';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import DataGrid, {
  DataGridRenderer,
  DataGridColumnDefinition
} from 'components/DataGrid';
import PatientInfoBox from 'components/PatientInfoBox';
import TimeDisplay from 'components/TimeDisplay';
import PluginDisplay from 'components/PluginDisplay';
import IconButton from 'components/IconButton';
import { ProgressBar } from 'components/react-bootstrap';
import browserHistory from 'browserHistory';
import styled from 'styled-components';
import Icon from '@smikitky/rb-components/lib/Icon';
import UserDisplay from 'components/UserDisplay';

const Operation: DataGridRenderer<any> = props => {
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

const PluginRenderer: DataGridRenderer<any> = props => {
  const {
    value: { pluginId }
  } = props;
  return <PluginDisplay size="lg" pluginId={pluginId} />;
};

const StatusRenderer: DataGridRenderer<any> = props => {
  const {
    value: { status }
  } = props;
  if (status === 'processing') {
    return <ProgressBar active bsStyle="info" now={100} label="processing" />;
  }
  const className = {
    in_queue: 'text-info',
    finished: 'text-success',
    invalidated: 'text-muted'
  }[status as 'in_queue' | 'finished' | 'invalidated'];
  return <span className={className || 'text-danger'}>{status}</span>;
};

const FeedbackRenderer: DataGridRenderer<any> = props => {
  const {
    value: { feedbacks = [] }
  } = props;
  const personals = feedbacks.filter((f: any) => !f.isConsensual).length;
  const consensual = feedbacks.filter((f: any) => f.isConsensual).length;
  const title = `${personals} personal feedback ${
    personals === 1 ? 'entry' : 'entries'
  }`;
  return (
    <span title={title}>
      {personals > 0 && (
        <span>
          <Icon icon="user" />
          {personals > 0 && personals}
        </span>
      )}
      {consensual > 0 && <Icon icon="tower" />}
      {!personals && !consensual && <span className="feedback-none">none</span>}
    </span>
  );
};

const columns: DataGridColumnDefinition<any>[] = [
  {
    caption: 'Plugin',
    className: 'plugin',
    renderer: PluginRenderer
  },
  {
    caption: 'Patient',
    className: 'patient',
    renderer: ({ value: { patientInfo } }) => {
      return <PatientInfoBox value={patientInfo} />;
    }
  },
  {
    caption: 'Executed by',
    className: 'executed-by',
    renderer: ({ value: { userEmail } }) => {
      return <UserDisplay userEmail={userEmail} />;
    }
  },
  {
    caption: 'Register/Finish',
    className: 'execution-time',
    renderer: props => (
      <Fragment>
        <TimeDisplay value={props.value.createdAt} />
        <br />
        <TimeDisplay value={props.value.finishedAt} invalidLabel="-" />
      </Fragment>
    )
  },
  {
    caption: 'Status',
    className: 'status',
    renderer: StatusRenderer
  },
  {
    caption: 'FB',
    className: 'feedback',
    renderer: FeedbackRenderer
  },
  { caption: '', className: 'operation', renderer: Operation }
];

const StyledDataGrid = styled(DataGrid)`
  .progress {
    height: 33px;
  }
  .progress-bar-info {
    line-height: 33px;
  }
  .status {
    text-align: center;
    font-weight: bold;
  }
`;

const DataView: React.FC<{ value: any[] }> = props => {
  const { value } = props;
  return (
    <StyledDataGrid
      className="plugin-job-search-result"
      columns={columns}
      value={value}
    />
  );
};

const sortOptions = makeSortOptions({
  createdAt: 'job date'
});

const PluginSearchResults: React.FC<{}> = props => {
  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable
      name="pluginJob"
    />
  );
};

export default PluginSearchResults;
