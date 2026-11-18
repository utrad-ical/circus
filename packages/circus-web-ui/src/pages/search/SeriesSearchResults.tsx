import type { Series } from '@utrad-ical/circus-api-schema';
import u from '#components/utilities.module.css';
import { confirm, modal } from '#components/dialogs.tsx';
import type {
  DataGridColumnDefinition,
  DataGridRenderer
} from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import CsVolumeDownloadModal from '#components/CsVolumeDownloadModal.tsx';
import DropdownButton from '#components/DropdownButton.tsx';
import Icon from '#components/Icon.tsx';
import MenuItem from '#components/MenuItem.tsx';
import MyListDropdown from '#components/MyListDropdown.tsx';
import SearchResultsView, {
  makeSortOptions,
  patientInfoSearchOptions
} from '#components/SearchResultsView.tsx';
import * as mr from 'multi-integer-range';
import React, { Fragment } from 'react';
import { useSelector } from 'react-redux';
import { dispatch } from '#store/index.ts';
import { showMessage } from '#store/messages.ts';
import { api } from '#utils/api.ts';
import { useLoginManager } from '#utils/loginManager.ts';
import useLoginUser from '#utils/useLoginUser.ts';
import {
  Modality,
  PatientInfo,
  Times,
  UidDisplay
} from './SearchResultRenderer.tsx';

const Operation: DataGridRenderer<Series> = props => {
  const { value: series } = props;
  const loginmanager = useLoginManager();
  const user = useLoginUser()!;
  const canDownload = user.globalPrivileges.includes('downloadVolume');

  // Opened at the top level, not inside the row
  const handleDownload = () =>
    modal(
      ({ onResolve }) => (
        <CsVolumeDownloadModal
          series={[
            { seriesUid: series.seriesUid, partialVolumeDescriptor: 'auto' }
          ]}
          editableSeries
          onClose={() => onResolve(null)}
        />
      ),
      { cancelable: false, size: 'large' }
    );

  const handleDelete = async (seriesUid: string, series: Series) => {
    const ans = await confirm(
      <>
        Are you sure you want to delete this series? This cannot be undone.
        <DataGrid
          className="series-search-result"
          itemPrimaryKey="seriesUid"
          columns={columns.slice(0, 5)}
          value={[series]}
          itemSelectable={false}
        />
      </>
    );
    if (!ans) return;
    try {
      await api(`/series/${seriesUid}`, {
        method: 'delete',
        handleErrors: [400]
      });
      dispatch(
        showMessage(
          <>
            Deleted the following series.
            <DataGrid
              className="series-search-result"
              itemPrimaryKey="seriesUid"
              columns={columns.slice(0, 5)}
              value={[series]}
              itemSelectable={false}
            />
          </>,
          'warning',
          { short: true }
        )
      );
    } catch (err: any) {
      dispatch(
        showMessage(<>Failed to delete: {err.response.data.error}</>, 'danger')
      );
    }
    loginmanager.refreshUserInfo(true);
  };

  return (
    <Fragment>
      <DropdownButton
        id="dropdown-new-item"
        size="small"
        variant="primary"
        title={
          <Fragment>
            <Icon icon="material-add" /> New
          </Fragment>
        }
      >
        <MenuItem eventKey="1" href={`/new-case/${series.seriesUid}`}>
          New Case
        </MenuItem>
        <MenuItem eventKey="2" href={`/new-job/${series.seriesUid}`}>
          New Job
        </MenuItem>
      </DropdownButton>
      &thinsp;
      <DropdownButton
        size="small"
        title={<Icon icon="material-more_horiz" />}
        align="end"
        noCaret
      >
        <MenuItem eventKey="1" href={`/series/${series.seriesUid}`}>
          View
        </MenuItem>
        <MenuItem
          eventKey="2"
          onSelect={handleDownload}
          disabled={!canDownload}
        >
          Download
        </MenuItem>
        <MenuItem
          eventKey="3"
          onClick={() => {
            handleDelete(series.seriesUid, series);
          }}
        >
          Delete
        </MenuItem>
      </DropdownButton>
    </Fragment>
  );
};

const columns: DataGridColumnDefinition<Series>[] = [
  { caption: '', className: 'modality', renderer: Modality },
  { caption: 'Patient', className: 'patient', renderer: PatientInfo },
  { caption: 'Series Desc', key: 'seriesDescription' },
  { caption: 'UID', key: 'seriesUid', renderer: UidDisplay },
  {
    caption: 'Images',
    key: 'images',
    renderer: props => {
      const { images } = props.value;
      const range = mr.initialize(images);
      const count = mr.length(range);
      const min = mr.min(range);
      const max = mr.max(range);
      if (min === 1 && max === count) {
        return <>{count}</>;
      } else {
        return (
          <>
            {count} ({min}-{max})
          </>
        );
      }
    }
  },
  {
    caption: 'Series/Import date',
    className: 'series-import',
    renderer: Times('seriesDate', 'createdAt')
  },
  { caption: '', className: u.textRight, renderer: Operation }
];

const DataView: React.FC<{
  value: Series[];
  selected: string[];
  onSelectionChange: (id: string, isSelected: boolean) => void;
}> = props => {
  const { value, selected, onSelectionChange } = props;
  return (
    <DataGrid
      className="series-search-result"
      itemPrimaryKey="seriesUid"
      columns={columns}
      value={value}
      itemSelectable={true}
      selectedItems={selected}
      onSelectionChange={onSelectionChange}
    />
  );
};

const sortOptions = makeSortOptions({
  createdAt: 'series import time',
  seriesUid: 'series instance UID',
  seriesDate: 'series date',
  modality: 'modality',
  ...patientInfoSearchOptions
});

const SeriesSearchResults: React.FC<{
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
            resourceType="series"
            resourceIds={selected}
            searchName={searchName}
          />
        </>
      )}
    </SearchResultsView>
  );
};

export default SeriesSearchResults;
