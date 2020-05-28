import React, { useState } from 'react';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import SearchResultsView from 'components/SearchResultsView';
import { Panel } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import { startNewSearch } from 'actions';
import { useDispatch } from 'react-redux';
import { modal } from '@smikitky/rb-components/lib/modal';
import { useApi } from 'utils/api';
import PartialVolumeDescriptorEditor from './PartialVolumeDescriptorEditor';
import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import TimeDisplay from './TimeDisplay';
import styled from 'styled-components';

const PartialVolumeRenderer: React.FC<{
  index: number;
  value: PartialVolumeDescriptor | undefined;
  onChange: (index: number, value: PartialVolumeDescriptor | undefined) => void;
}> = props => {
  const { index, value, onChange } = props;

  const handleClick = async () => {
    const result = await modal((props: any) => (
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
      {applied ? describePartialVolumeDescriptor(value!, 3) : 'not applied'}
    </IconButton>
  );
};

const RelevantSeriesDataView: React.FC<any> = props => {
  const { onSeriesRegister, value } = props;
  const columns = [
    { key: 'seriesDescription', caption: 'Series Description' },
    { key: 'seriesUid', caption: 'Series UID' },
    {
      key: 'action',
      caption: '',
      renderer: ({ value }: { value: any }) => (
        <IconButton
          icon="chevron-up"
          bsSize="xs"
          onClick={() => onSeriesRegister(value.seriesUid)}
        >
          Add
        </IconButton>
      )
    }
  ] as DataGridColumnDefinition<any>[];
  return <DataGrid value={value} columns={columns} />;
};

const RelevantSeries: React.FC<{
  onSeriesRegister: Function;
}> = props => {
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

interface SeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor | undefined;
  data: {
    modality: string;
    seriesDescription: string;
    images: string;
    seriesDate: string;
  };
}

const SeriesSelector: React.FC<{
  value: SeriesEntry[];
  onChange: any;
}> = props => {
  const [showRelevantSeries, setShowRelevantSeries] = useState(false);
  const api = useApi();
  const dispatch = useDispatch();
  const { value, onChange } = props;

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

  const handlePartialVolumeChange = (
    volumeId: number,
    descriptor: PartialVolumeDescriptor | undefined
  ) => {
    const newValue = value.map((v, i) => {
      return i === volumeId
        ? { ...value[volumeId], partialVolumeDescriptor: descriptor }
        : v;
    });
    onChange(newValue);
  };

  const handleSeriesRegister = async (seriesUid: string) => {
    if (value.some(s => s.seriesUid === seriesUid)) return;
    const series = await api('series/' + seriesUid);
    const newEntry = {
      seriesUid,
      partialVolumeDescriptor: undefined,
      data: series
    };
    onChange([...value, newEntry]);
  };

  const handleSeriesRemove = (seriesUid: string) => {
    const newValue = value.filter(s => s.seriesUid !== seriesUid);
    onChange(newValue);
  };

  const columns = [
    {
      key: 'volumeId',
      caption: '#',
      renderer: props => <>{props.index}</>
    },
    {
      key: 'modality',
      caption: 'Modality',
      renderer: ({ value }) => {
        console.log('VV', value);
        return <>{value.data.modality}</>;
      }
    },
    {
      key: 'seriesDescription',
      caption: 'Series desc',
      renderer: ({ value }) => <>{value.data.seriesDescription}</>
    },
    {
      key: 'seriesUid',
      caption: 'Series UID',
      renderer: ({ value }) => <SeriesUidSpan>{value.seriesUid}</SeriesUidSpan>
    },
    {
      key: 'seriesDate',
      caption: 'Series Date',
      renderer: ({ value }) => <TimeDisplay value={value.data.seriesDate} />
    },
    {
      key: 'images',
      caption: 'Images',
      renderer: ({ value }) => <>{value.data.images}</>
    },
    {
      key: 'pvd',
      caption: 'Partial Volume',
      renderer: ({ value, index }) => (
        <PartialVolumeRenderer
          value={value.partialVolumeDescriptor}
          index={index}
          onChange={handlePartialVolumeChange}
        />
      )
    },
    {
      className: 'delete',
      renderer: ({ value }) => (
        <IconButton
          bsSize="xs"
          icon="remove"
          onClick={() => handleSeriesRemove(value.seriesUid)}
        />
      )
    }
  ] as DataGridColumnDefinition<SeriesEntry>[];

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

const SeriesUidSpan = styled.span`
  font-size: 80%;
  word-break: break-all;
`;

export default SeriesSelector;
