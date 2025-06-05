import { confirm } from '@smikitky/rb-components/lib/modal';
import DataGrid, {
  DataGridColumnDefinition,
  DataGridRenderer
} from 'components/DataGrid';
import DropdownButton from 'components/DropdownButton';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import MenuItem from 'components/MenuItem';
import MyListDropdown from 'components/MyListDropdown';
import SearchResultsView, {
  makeSortOptions,
  patientInfoSearchOptions
} from 'components/SearchResultsView';
import React, { Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import * as searches from 'store/searches';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import useShowMessage from 'utils/useShowMessage';
import {
  Executer,
  FeedbackRenderer,
  JobId,
  PatientInfo,
  PluginRenderer,
  Status,
  Times
} from './SearchResultRenderer';

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
  const navigate = useNavigate();

  const handleViewClick = () => {
    if (job.status !== 'finished') return;
    dispatch(searches.setNextPreviousList(search?.results?.indexes ?? []));
    const url = `/plugin-job/${job.jobId}`;
    navigate(url);
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
        size="sm"
        title={<Icon icon="material-more_horiz" />}
        placement="bottom-end"
        noCaret
        onSelect={handleMenuClick}
      >
        <MenuItem eventKey="cancel" disabled={job.status !== 'in_queue'}>
          Cancel
        </MenuItem>
        <MenuItem eventKey="invalidate" disabled={job.status !== 'finished'}>
          Invalidate
        </MenuItem>
      </DropdownButton>
    </Fragment>
  );
};

const columns: DataGridColumnDefinition<any>[] = [
  { caption: 'Plugin', className: 'plugin', renderer: PluginRenderer() },
  { caption: 'Patient', className: 'patient', renderer: PatientInfo },
  { caption: 'Job ID', className: 'job-id', renderer: JobId },
  { caption: 'Executed by', className: 'executed-by', renderer: Executer },
  {
    caption: 'Register/Finish',
    className: 'execution-time',
    renderer: Times('createdAt', 'finishedAt')
  },
  { caption: 'Status', className: 'status', renderer: Status },
  { caption: 'FB', className: 'feedback', renderer: FeedbackRenderer },
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
