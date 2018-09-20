import React, { Fragment } from 'react';
import DataGrid from 'components/DataGrid';
import SearchResultsView from 'components/SearchResultsView';
import { Panel } from 'components/react-bootstrap';
import IconButton from '../components/IconButton';
import { startNewSearch } from 'actions';
import { connect } from 'react-redux';
import MultiRange from 'multi-integer-range';
import { prompt } from 'rb/modal';
import classnames from 'classnames';
import { api } from 'utils/api';

const ImagesRenderer = props => {
  const { value, onRangeChange } = props;
  const imageRange = new MultiRange(value.images);

  const handleEditClick = async () => {
    const validator = str => {
      let mr;
      const errorMessage =
        'Please specify an inter range in the form like `3` or `1-3`.';
      try {
        mr = new MultiRange(str);
      } catch (e) {
        return errorMessage;
      }
      if (!str.length) return 'input something';
      if (mr.segmentLength() !== 1) return errorMessage;
      if (!imageRange.has(mr))
        return 'Specified range is not included in the original image range.';
      return null;
    };

    const ans = await prompt(
      <span>
        Specify a <strong>continuous</strong> image range within{' '}
        <b>{value.images}</b>.
      </span>,
      value.range,
      { validator }
    );

    if (!ans) return;
    onRangeChange(ans);
  };

  const classes = classnames({
    'text-danger': !imageRange.equals(value.range)
  });

  return (
    <Fragment>
      <span className={classes}>{value.range}</span>{' '}
      <IconButton
        onClick={handleEditClick}
        bsStyle="default"
        bsSize="xs"
        icon="edit"
      />
    </Fragment>
  );
};

const RelevantSeriesDataView = props => {
  const { onSeriesRegister } = props;
  const columns = [
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

  handleRangeChange = (newRange, volumeId) => {
    const { value, onChange } = this.props;
    const newValue = value.map((v, i) => {
      return i === volumeId
        ? { ...value[volumeId], range: new MultiRange(newRange).toString() }
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
      { key: 'volumeId', caption: '#' },
      { key: 'modality', caption: 'Modality' },
      { key: 'seriesUid', caption: 'Series' },
      { key: 'seriesDescription', caption: 'Series desc' },
      {
        key: 'images',
        caption: 'Range',
        renderer: props => (
          <ImagesRenderer
            value={props.value}
            onRangeChange={range =>
              this.handleRangeChange(range, props.value.volumeId)
            }
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
            Add Another Series
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
