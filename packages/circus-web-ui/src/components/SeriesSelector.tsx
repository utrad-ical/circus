import React, { useState, useMemo } from 'react';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import SearchResultsView from 'components/SearchResultsView';
import { Panel } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import { newSearch } from 'store/searches';
import { useDispatch } from 'react-redux';
import { modal } from '@smikitky/rb-components/lib/modal';
import { useApi } from 'utils/api';
import PartialVolumeDescriptorEditor from './PartialVolumeDescriptorEditor';
import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import TimeDisplay from './TimeDisplay';
import styled from 'styled-components';
import { multirange } from 'multi-integer-range';
import { confirm } from '@smikitky/rb-components/lib/modal';

const PartialVolumeRenderer: React.FC<{
  index: number;
  value: PartialVolumeDescriptor | undefined;
  images: string; // multi-integer-range string (eg '1-20,30')
  onChange: (index: number, value: PartialVolumeDescriptor | undefined) => void;
}> = props => {
  const { index, value, images, onChange } = props;
  const mr = useMemo(() => multirange(images), [images]);

  const handleClick = async () => {
    const result = await modal((props: any) => (
      <PartialVolumeDescriptorEditor
        initialValue={value ?? { start: mr.min(), end: mr.max(), delta: 1 }}
        images={mr}
        {...props}
      />
    ));
    if (!result) return; // cancelled
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
      {applied ? describePartialVolumeDescriptor(value!, 3) : 'full'}
    </IconButton>
  );
};

const RelevantSeries: React.FC<{
  onSeriesRegister: (seriesUid: string) => void;
}> = props => {
  const { onSeriesRegister } = props;

  const RelevantSeriesDataView: React.FC<any> = useMemo(
    () => props => {
      const { value } = props;
      const columns: DataGridColumnDefinition<any>[] = [
        { key: 'seriesDescription', caption: 'Series Desc' },
        {
          key: 'seriesUid',
          caption: 'Series UID',
          renderer: ({ value }) => (
            <SeriesUidSpan>{value.seriesUid}</SeriesUidSpan>
          )
        },
        { key: 'images', caption: 'Images' },
        {
          key: 'seriesDate',
          caption: 'Series Date',
          renderer: ({ value }) => <TimeDisplay value={value.seriesDate} />
        },
        {
          key: 'action',
          caption: '',
          renderer: ({ value }) => (
            <IconButton
              icon="chevron-up"
              bsSize="xs"
              bsStyle="primary"
              onClick={() => onSeriesRegister(value.seriesUid)}
            >
              Add
            </IconButton>
          )
        }
      ];
      return <DataGrid value={value} columns={columns} />;
    },
    [onSeriesRegister]
  );

  return (
    <SearchResultsView
      name="relevantSeries"
      dataView={RelevantSeriesDataView}
    />
  );
};

export interface SeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor | undefined;
  data: {
    modality: string;
    studyUid: string;
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
      const filter = { studyUid: value[0].data.studyUid };
      dispatch(
        newSearch(api, 'relevantSeries', {
          resource: { endPoint: 'series', primaryKey: 'seriesUid' },
          filter,
          condition: {},
          sort: '{}'
        })
      );
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
    if (value.some(s => s.seriesUid === seriesUid)) {
      if (!(await confirm('Add the same series?'))) return;
    }
    const series = await api('series/' + seriesUid);
    const newEntry = {
      seriesUid,
      partialVolumeDescriptor: undefined,
      data: series
    };
    onChange([...value, newEntry]);
  };

  const handleSeriesRemove = (index: number) => {
    if (value.length <= 1) return;
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const columns: DataGridColumnDefinition<SeriesEntry>[] = [
    {
      key: 'volumeId',
      caption: '#',
      renderer: props => <>{props.index}</>
    },
    {
      key: 'modality',
      caption: 'Modality',
      renderer: ({ value }) => <>{value.data.modality}</>
    },
    {
      key: 'seriesDescription',
      caption: 'Series Desc',
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
      caption: 'Range',
      renderer: ({ value, index }) => (
        <PartialVolumeRenderer
          value={value.partialVolumeDescriptor}
          images={value.data.images}
          index={index}
          onChange={handlePartialVolumeChange}
        />
      )
    },
    {
      className: 'delete',
      renderer: ({ value, index }) => (
        <IconButton
          bsSize="xs"
          icon="remove"
          onClick={() => handleSeriesRemove(index)}
        />
      )
    }
  ];

  return (
    <Panel header="Series">
      <Panel.Heading>Series</Panel.Heading>
      <Panel.Body>
        <DataGrid columns={columns} value={value} />
        <div>
          <IconButton
            icon="plus"
            bsSize="sm"
            onClick={handleAddSeriesClick}
            active={showRelevantSeries}
          >
            Add Series
          </IconButton>
          {showRelevantSeries && ' Showing series from the same study'}
        </div>
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
