import Icon from '@smikitky/rb-components/lib/Icon';
import { confirm } from '@smikitky/rb-components/lib/modal';
import DataGrid, {
  DataGridColumnDefinition,
  DataGridRenderer
} from 'components/DataGrid';
import IconButton from 'components/IconButton';
import IdDisplay from 'components/IdDisplay';
import MyListDropdown from 'components/MyListDropdown';
import PatientInfoBox from 'components/PatientInfoBox';
import PluginDisplay from 'components/PluginDisplay';
import {
  DropdownButton,
  MenuItem,
  ProgressBar
} from 'components/react-bootstrap';
import SearchResultsView, {
  makeSortOptions,
  patientInfoSearchOptions
} from 'components/SearchResultsView';
import TimeDisplay from 'components/TimeDisplay';
import UserDisplay from 'components/UserDisplay';
import React, { Fragment, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import * as searches from 'store/searches';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import browserHistory from '../../browserHistory';
import useShowMessage from 'utils/useShowMessage';

const Operation: DataGridRenderer<any> = props => {
  const { value: job } = props;
  const dispatch = useDispatch();
  const location = useLocation();
  const api = useApi();
  const showMessage = useShowMessage();
  const searchName =
    location.pathname.indexOf('/browse/plugin-jobs/mylist') === 0
      ? 'myPluginJobList'
      : 'pluginJob';
  const search = useSelector(state => state.searches.searches[searchName]);

  const handleViewClick = () => {
    if (job.status !== 'finished') return;
    dispatch(searches.setNextPreviousList(search?.results?.indexes ?? []));
    const url = `/plugin-job/${job.jobId}`;
    browserHistory.push(url);
  };

  const handleMenuClick = async (selection: any) => {
    if (!(await confirm(`Are you sure you want to ${selection} this job?`))) {
      return;
    }
    await api(`/plugin-jobs/${job.jobId}`, {
      method: 'PATCH',
      data: { status: selection === 'cancel' ? 'cancelled' : 'invalidated' }
    });
    showMessage(`Job ${selection}ed successfully.`, 'success', { short: true });
    dispatch(searches.updateSearch(api, searchName, {}));
  };

  return (
    <Fragment>
      <IconButton
        disabled={job.status !== 'finished'}
        icon="circus-series"
        bsSize="sm"
        bsStyle="primary"
        onClick={handleViewClick}
      >
        View
      </IconButton>
      &thinsp;
      <DropdownButton
        bsSize="sm"
        title={<Icon icon="glyphicon-option-horizontal" />}
        id={`dropdown-`}
        pullRight
        noCaret
        onSelect={handleMenuClick}
      >
        <MenuItem eventKey="cancel" disabled={job.status !== 'in_quue'}>
          Cancel
        </MenuItem>
        <MenuItem eventKey="invalidate" disabled={job.status !== 'finished'}>
          Invalidate
        </MenuItem>
      </DropdownButton>
    </Fragment>
  );
};

const PluginRenderer: DataGridRenderer<any> = props => {
  const {
    value: { pluginId }
  } = props;
  return <PluginDisplay size="lg" pluginId={pluginId} />;
};

const JobId: React.FC<{
  value: any;
}> = props => {
  const { jobId } = props.value;
  const ids = useMemo(() => ({ 'Job ID': jobId }), [jobId]);
  return <IdDisplay value={ids} />;
};

const StatusRenderer: DataGridRenderer<any> = props => {
  const {
    value: { status }
  } = props;
  if (status === 'processing') {
    return <ProgressBar active bsStyle="info" now={100} label="processing" />;
  }
  const className = { in_queue: 'text-info', finished: 'text-success' }[
    status as 'in_queue' | 'finished'
  ];
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
    caption: 'Job ID',
    className: 'job-id',
    renderer: JobId
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

const DataView: React.FC<{
  value: any[];
  selected: string[];
  onSelectionChange: (id: string, isSelected: boolean) => void;
}> = props => {
  const { value, selected, onSelectionChange } = props;
  return (
    <StyledDataGrid
      className="plugin-job-search-result"
      columns={columns}
      itemPrimaryKey="jobId"
      value={value}
      itemSelectable={true}
      selectedItems={selected}
      onSelectionChange={onSelectionChange}
    />
  );
};

const sortOptions = makeSortOptions({
  createdAt: 'job date',
  ...patientInfoSearchOptions
});

const PluginSearchResults: React.FC<{
  searchName: string;
  refreshable?: boolean;
}> = props => {
  const { searchName, refreshable = true } = props;
  const search = useSelector(state => state.searches.searches[searchName]);
  const selected = search?.selected ?? [];

  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable={refreshable}
      name={searchName}
    >
      {selected.length > 0 && (
        <>
          <MyListDropdown
            resourceType="pluginJobs"
            resourceIds={selected}
            searchName={searchName}
          />
        </>
      )}
    </SearchResultsView>
  );
};

export default PluginSearchResults;
