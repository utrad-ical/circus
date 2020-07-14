import React, { Fragment } from 'react';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import DataGrid, {
  DataGridColumnDefinition,
  DataGridRenderer
} from 'components/DataGrid';
import PatientInfoBox from 'components/PatientInfoBox';
import TimeDisplay from 'components/TimeDisplay';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import { DropdownButton, MenuItem } from 'components/react-bootstrap';

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
  {
    caption: 'Series Date',
    className: 'series-date',
    renderer: props => <TimeDisplay value={props.value.seriesDate} />
  },
  {
    caption: 'Import date',
    className: 'created-at',
    renderer: props => <TimeDisplay value={props.value.createdAt} />
  },
  { caption: '', className: 'operation', renderer: Operation }
];

const DataView: React.FC<{ value: any[] }> = props => {
  const { value } = props;
  return (
    <DataGrid
      className="series-search-result"
      columns={columns}
      value={value}
    />
  );
};

const sortOptions = makeSortOptions({
  createdAt: 'series import time',
  seriesUid: 'series instance UID',
  seriesDate: 'series date',
  modality: 'modality'
});

const SeriesSearchResults: React.FC<{}> = props => {
  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable
      name="series"
    />
  );
};

export default SeriesSearchResults;
