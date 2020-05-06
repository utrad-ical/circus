import React, { useState, Fragment } from 'react';
import DataGrid from 'components/DataGrid';
import SearchResultsView from 'components/SearchResultsView';
import { Panel } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import { startNewSearch } from 'actions';
import { connect } from 'react-redux';
import { modal } from 'rb/modal';
import { useApi } from 'utils/api';
import PartialVolumeDescriptorEditor from './PartialVolumeDescriptorEditor';
import { describePartialVolumeDescriptor } from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';

const PartialVolumeRenderer = props => {
  const { index, value, onChange } = props;

  const handleClick = async () => {
    const result = await modal(props => (
      <PartialVolumeDescriptorEditor
        initialValue={{ start: 1, end: 10, delta: 1 }}
        {...props}
      />
    ));
    if (!result) return;
    onChange(index, result.descriptor);
  };

  const applied = !!value;

  return (
    <IconButton
      icon="edit"
      bsSize="xs"
      onClick={handleClick}
      bsStyle={applied ? 'success' : 'default'}
    >
      {applied ? describePartialVolumeDescriptor(value, 3) : 'not applied'}
    </IconButton>
  );
};

const RelevantSeriesDataView = props => {
  const { onSeriesRegister } = props;
  const columns = [
    { key: 'seriesDescription', caption: 'Series Description' },
    { key: 'seriesUid', caption: 'Series UID' },
    {
      key: 'action',
      caption: '',
      renderer: ({ value }) => (
        <IconButton
          icon="chevron-up"
          bsSize="xs"
          onClick={() => onSeriesRegister(value.seriesUid)}
        >
          Add
        </IconButton>
      )
    }
  ];
  return <DataGrid value={props.value} columns={columns} />;
};

const RelevantSeries = props => {
  const { onSeriesRegister } = props;
  return (
    <div>
      <h4>Series from the same study</h4>
      <SearchResultsView
        name="relevantSeries"
        dataView={RelevantSeriesDataView}
        onSeriesRegister={onSeriesRegister}
      />
    </div>
  );
};

const SeriesSelectorView = props => {
  const [showRelevantSeries, setShowRelevantSeries] = useState(false);
  const api = useApi();
  const { dispatch, value, onChange } = props;

  const handleAddSeriesClick = () => {
    if (!showRelevantSeries) {
      const filter = {
        // studyUid: value.map(s => s.studyUid)
      };
      dispatch(startNewSearch(api, 'relevantSeries', 'series', filter, {}, {}));
      setShowRelevantSeries(true);
    } else {
      setShowRelevantSeries(false);
    }
  };

  const handlePartialVolumeChange = (volumeId, descriptor) => {
    const newValue = value.map((v, i) => {
      return i === volumeId
        ? { ...value[volumeId], partialVolumeDescriptor: descriptor }
        : v;
    });
    onChange(newValue);
  };

  const handleSeriesRegister = async seriesUid => {
    if (value.some(s => s.seriesUid === seriesUid)) return;
    const series = await api('series/' + seriesUid);
    const newEntry = { ...series, range: series.images };
    onChange([...value, newEntry]);
  };

  const handleSeriesRemove = seriesUid => {
    const newValue = value.filter(s => s.seriesUid !== seriesUid);
    onChange(newValue);
  };

  const columns = [
    {
      key: 'volumeId',
      caption: '#',
      renderer: props => <Fragment>{props.index}</Fragment>
    },
    { key: 'modality', caption: 'Modality' },
    { key: 'seriesUid', caption: 'Series' },
    { key: 'seriesDescription', caption: 'Series desc' },
    {
      key: 'images',
      caption: 'Partial Volume',
      renderer: props => (
        <PartialVolumeRenderer
          value={props.value.partialVolumeDescriptor}
          index={props.index}
          onChange={handlePartialVolumeChange}
        />
      )
    },
    {
      className: 'delete',
      renderer: props => (
        <IconButton
          bsSize="xs"
          icon="remove"
          onClick={() => handleSeriesRemove(props.value.seriesUid)}
        />
      )
    }
  ];

  return (
    <Panel header="Series">
      <Panel.Heading>Series</Panel.Heading>
      <Panel.Body>
        <DataGrid columns={columns} value={value} />
        <IconButton
          icon="plus"
          bsSize="sm"
          onClick={handleAddSeriesClick}
          active={showRelevantSeries}
        >
          Add Series
        </IconButton>
        {showRelevantSeries && (
          <RelevantSeries onSeriesRegister={handleSeriesRegister} />
        )}
      </Panel.Body>
    </Panel>
  );
};

const SeriesSelector = connect()(SeriesSelectorView);
export default SeriesSelector;
