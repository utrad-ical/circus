import DataGrid, {
  DataGridColumnDefinition,
  DataGridRenderer
} from 'components/DataGrid';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import MyListDropdown from 'components/MyListDropdown';
import PatientInfoBox from 'components/PatientInfoBox';
import {
  DropdownButton,
  MenuItem,
  OverlayTrigger,
  Popover
} from 'components/react-bootstrap';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import TimeDisplay from 'components/TimeDisplay';
import { multirange } from 'multi-integer-range';
import React, { useState, Fragment } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

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

const SeriesPopover = styled(Popover)`
  font-size: 80%;
  max-width: none;
`;

const Modality: DataGridRenderer<any> = props => {
  const series = props.value;
  return <ModalitySpan>{series.modality}</ModalitySpan>;
};

const Operation: DataGridRenderer<any> = props => {
  const { value: series } = props;
  return (
    <Fragment>
      <Link to={`/series/${series.seriesUid}`}>
        <IconButton icon="circus-series" bsSize="sm">
          View
        </IconButton>
      </Link>
      &thinsp;
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
    </Fragment>
  );
};

const UidDisplay: React.FC<{
  value: { seriesUid: string; studyUid: string };
}> = React.memo(props => {
  const { seriesUid, studyUid } = props.value;

  const overlay = (
    <SeriesPopover
      className="series-popover"
      id={`series-popover-${seriesUid.replace(/\./g, '-')}`}
    >
      <b>Study UID:</b> {studyUid}
      <IconButton
        icon="glyphicon-copy"
        bsSize="xs"
        bsStyle="link"
        onClick={() => navigator.clipboard.writeText(studyUid)}
      />
      <br />
      <b>Series UID:</b> {seriesUid}
      <IconButton
        icon="glyphicon-copy"
        bsSize="xs"
        bsStyle="link"
        onClick={() => navigator.clipboard.writeText(seriesUid)}
      />
    </SeriesPopover>
  );
  return (
    <OverlayTrigger trigger="click" rootClose placement="top" overlay={overlay}>
      <IconButton icon="glyphicon-zoom-in" bsStyle="link" bsSize="xs" />
    </OverlayTrigger>
  );
});

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
  modality: 'modality'
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
