import React, { Fragment } from 'react';
import SearchResultsView, {
  makeSortOptions
} from '../../components/SearchResultsView';
import { Link } from 'react-router';
import DataGrid from '../../components/DataGrid';
import PatientInfoBox from '../../components/PatientInfoBox';
import TimeDisplay from '../../components/TimeDisplay';
import IconButton from 'shared/components/IconButton';

const Modality = props => {
  const series = props.value;
  return (
    <span className="modality-marker label label-default">
      {series.modality}
    </span>
  );
};

const Operation = props => {
  const { value: series } = props;
  return (
    <Fragment>
      <Link to={`/series/${series.seriesUid}`}>
        <IconButton icon="circus-series" bsSize="sm">
          View
        </IconButton>
      </Link>
      &thinsp;
      <Link to={`/new-case/${series.seriesUid}`}>
        <IconButton icon="circus-case" bsStyle="primary" bsSize="sm">
          New
        </IconButton>
      </Link>
    </Fragment>
  );
};

const columns = [
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

const DataView = props => {
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

const SeriesSearchResults = props => {
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
