import { confirm } from '@smikitky/rb-components/lib/modal';
import DataGrid, {
  DataGridColumnDefinition,
  DataGridRenderer
} from 'components/DataGrid';
import Icon from 'components/Icon';
import IdDisplay from 'components/IdDisplay';
import MyListDropdown from 'components/MyListDropdown';
import PatientInfoBox from 'components/PatientInfoBox';
import { DropdownButton, MenuItem } from 'components/react-bootstrap';
import SearchResultsView, {
  makeSortOptions,
  patientInfoSearchOptions
} from 'components/SearchResultsView';
import TimeDisplay from 'components/TimeDisplay';
import { multirange } from 'multi-integer-range';
import React, { Fragment, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { dispatch } from 'store';
import { showMessage } from 'store/messages';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import { useLoginManager } from 'utils/loginManager';

const ModalitySpan = styled.span`
  display: inline-block;
  min-width: 50px;
  padding: 0;
  font-size: 110%;
  border-radius: 3px;
  text-align: center;
  background-color: #777777;
  color: white;
`;

const Modality: DataGridRenderer<any> = props => {
  const series = props.value;
  return <ModalitySpan>{series.modality}</ModalitySpan>;
};

const Operation: DataGridRenderer<any> = props => {
  const { value: series } = props;
  const api = useApi();
  const loginmanager = useLoginManager();

  const handleDelete = async (seriesUid: string, series: any) => {
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
        bsSize="sm"
        bsStyle="primary"
        title={
          <Fragment>
            <Icon icon="plus" /> New
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
        bsSize="sm"
        title={<Icon icon="glyphicon-option-horizontal" />}
        id={`dropdown-`}
        pullRight
        noCaret
      >
        <MenuItem eventKey="1" href={`/series/${series.seriesUid}`}>
          View
        </MenuItem>
        <MenuItem
          eventKey="2"
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

export const UidDisplay: React.FC<{
  value: { seriesUid: string; studyUid: string };
}> = props => {
  const { seriesUid, studyUid } = props.value;
  const ids = useMemo(
    () => ({ 'Series UID': seriesUid, 'Study UID': studyUid }),
    [seriesUid, studyUid]
  );
  return <IdDisplay value={ids} />;
};

const columns: DataGridColumnDefinition<any>[] = [
  { caption: '', className: 'modality', renderer: Modality },
  {
    caption: 'Patient',
    className: 'patient',
    renderer: ({ value: { patientInfo } }) => {
      return <PatientInfoBox value={patientInfo} />;
    }
  },
  { caption: 'Series Desc', key: 'seriesDescription' },
  { caption: 'UID', key: 'seriesUid', renderer: UidDisplay },
  {
    caption: 'Images',
    key: 'images',
    renderer: props => {
      const { images } = props.value;
      const mr = multirange(images);
      const count = mr.length();
      if (mr.min() === 1 && mr.max() === count) {
        return <>{count}</>;
      } else {
        return (
          <>
            {count} ({mr.min()}-{mr.max()})
          </>
        );
      }
    }
  },
  {
    caption: 'Series/Import date',
    className: 'series-import',
    renderer: props => (
      <>
        <TimeDisplay value={props.value.seriesDate} />
        <br />
        <TimeDisplay value={props.value.createdAt} />
      </>
    )
  },
  { caption: '', className: 'operation', renderer: Operation }
];

const DataView: React.FC<{
  value: any[];
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
