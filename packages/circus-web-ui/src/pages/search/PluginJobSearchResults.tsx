import u from '#components/utilities.module.css';
import Button from '#components/Button.tsx';
import { confirm } from '#components/dialogs.tsx';
import type {
  DataGridColumnDefinition,
  DataGridRenderer
} from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import DropdownButton from '#components/DropdownButton.tsx';
import Icon from '#components/Icon.tsx';
import MenuItem from '#components/MenuItem.tsx';
import MyListDropdown from '#components/MyListDropdown.tsx';
import SearchResultsView, {
  makeSortOptions,
  patientInfoSearchOptions
} from '#components/SearchResultsView.tsx';
import React, { Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import * as searches from '#store/searches.ts';
import styles from './PluginJobSearchResults.module.css';
import { api } from '#utils/api.ts';
import useShowMessage from '#utils/useShowMessage.ts';
import {
  Executer,
  FeedbackRenderer,
  JobId,
  PatientInfo,
  PluginRenderer,
  Status,
  Times
} from './SearchResultRenderer.tsx';

const Operation: DataGridRenderer<any> = props => {
  const { value: job } = props;
  const dispatch = useDispatch();
  const location = useLocation();
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
    dispatch(searches.updateSearch(searchName, {}));
  };

  return (
    <Fragment>
      <Button
        disabled={job.status !== 'finished'}
        icon="circus-series"
        size="small"
        variant="primary"
        onClick={handleViewClick}
      >
        View
      </Button>
      &thinsp;
      <DropdownButton
        size="small"
        title={<Icon icon="material-more_horiz" />}
        align="end"
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
  { caption: 'Status', className: styles.status, renderer: Status },
  { caption: 'FB', className: 'feedback', renderer: FeedbackRenderer },
  { caption: '', className: u.textRight, renderer: Operation }
];

const DataView: React.FC<{
  value: any[];
  selected: string[];
  onSelectionChange: (id: string, isSelected: boolean) => void;
}> = props => {
  const { value, selected, onSelectionChange } = props;
  return (
    <DataGrid
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
