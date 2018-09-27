import React, { Fragment } from 'react';
import DataGrid from 'components/DataGrid';
import SearchResultsView from 'components/SearchResultsView';
import { Panel } from 'components/react-bootstrap';
import IconButton from '../components/IconButton';
import { startNewSearch } from 'actions';
import { connect } from 'react-redux';
import { modal } from 'rb/modal';
import { api } from 'utils/api';
import PartialVolumeDescriptorEditor from './PartialVolumeDescriptorEditor';
import * as pv from '@utrad-ical/circus-lib/lib/PartialVolumeDescriptor';

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
      {applied ? pv.describePartialVolumeDescriptor(value, 3) : 'not applied'}
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

class SeriesSelectorView extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { showRelevantSeries: false };
  }

  handleAddSeriesClick = () => {
    const { dispatch } = this.props;
    if (!this.state.showRelevantSeries) {
      const filter = {
        // studyUid: this.state.selectedSeries.map(s => s.studyUid)
      };
      dispatch(startNewSearch('relevantSeries', 'series', filter, {}, {}));
      this.setState({ showRelevantSeries: true });
    } else {
      this.setState({ showRelevantSeries: false });
    }
  };

  handlePartialVolumeChange = (volumeId, descriptor) => {
    const { value, onChange } = this.props;
    const newValue = value.map((v, i) => {
      return i === volumeId
        ? { ...value[volumeId], partialVolumeDescriptor: descriptor }
        : v;
    });
    onChange(newValue);
  };

  handleSeriesRegister = async seriesUid => {
    const { value, onChange } = this.props;
    if (value.some(s => s.seriesUid === seriesUid)) return;
    const series = await api('series/' + seriesUid);
    const newEntry = { ...series, range: series.images };
    onChange([...value, newEntry]);
  };

  handleSeriesRemove = seriesUid => {
    const { value, onChange } = this.props;
    const newValue = value.filter(s => s.seriesUid !== seriesUid);
    onChange(newValue);
  };

  render() {
    const { value } = this.props;
    const { showRelevantSeries } = this.state;

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
            onChange={this.handlePartialVolumeChange}
          />
        )
      },
      {
        className: 'delete',
        renderer: props => (
          <IconButton
            bsSize="xs"
            icon="remove"
            onClick={() => this.handleSeriesRemove(props.value.seriesUid)}
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
            onClick={this.handleAddSeriesClick}
            active={showRelevantSeries}
          >
            Add Series
          </IconButton>
          {showRelevantSeries && (
            <RelevantSeries onSeriesRegister={this.handleSeriesRegister} />
          )}
        </Panel.Body>
      </Panel>
    );
  }
}

const SeriesSelector = connect()(SeriesSelectorView);
export default SeriesSelector;
