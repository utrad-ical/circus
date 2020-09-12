import { confirm, modal } from '@smikitky/rb-components/lib/modal';
import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import IconButton from 'components/IconButton';
import { Panel } from 'components/react-bootstrap';
import SearchResultsView from 'components/SearchResultsView';
import produce from 'immer';
import { multirange } from 'multi-integer-range';
import React, { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { newSearch } from 'store/searches';
import styled from 'styled-components';
import Series from 'types/Series';
import { useApi } from 'utils/api';
import PartialVolumeDescriptorEditor from './PartialVolumeDescriptorEditor';
import TimeDisplay from './TimeDisplay';

const PartialVolumeRenderer: React.FC<{
  index: number;
  value: PartialVolumeDescriptor | undefined;
  images: string; // multi-integer-range string (eg '1-20,30')
  onChange: (index: number, value: PartialVolumeDescriptor | undefined) => void;
}> = props => {
  const { index, value, images, onChange } = props;
  const mr = useMemo(() => multirange(images), [images]);

  const handleClick = async () => {
    const result = (await modal(
      (props: any) => (
        <PartialVolumeDescriptorEditor
          initialValue={value ?? { start: mr.min(), end: mr.max(), delta: 1 }}
          images={mr}
          {...props}
        />
      ),
      {}
    )) as { descriptor: PartialVolumeDescriptor };
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
}

const SeriesSelector: React.FC<{
  value: SeriesEntry[];
  onChange: any;
  alwaysShowRelevaltSeries?: boolean;
}> = props => {
  const { value, onChange, alwaysShowRelevaltSeries } = props;
  const [showRelevantSeries, setShowRelevantSeries] = useState(
    !!alwaysShowRelevaltSeries
  );
  const api = useApi();
  const dispatch = useDispatch();
  const searches = useSelector(state => state.searches);

  const [seriesData, setSeriesData] = useState<{
    [seriesUid: string]: Series | null; // null means "now loading"
  }>({});

  useEffect(() => {
    const loadSeriesData = async (seriesUid: string) => {
      if (seriesUid in seriesData) return;
      const data =
        searches?.series?.results?.items?.[seriesUid] ??
        searches?.relevantSeries?.results?.items?.[seriesUid];
      if (data) {
        setSeriesData(
          produce(seriesData, seriesData => {
            seriesData[seriesUid] = data;
          })
        );
      } else {
        setSeriesData(
          produce(seriesData, seriesData => {
            seriesData[seriesUid] = null; // "now loading"
          })
        );
        const data = (await api('series/' + seriesUid)) as Series;
        setSeriesData(
          produce(seriesData, seriesData => {
            seriesData[seriesUid] = data;
          })
        );
      }
    };
    value.forEach(value => loadSeriesData(value.seriesUid));
  }, [api, searches, seriesData, value]);

  const handleAddSeriesClick = () => {
    if (!showRelevantSeries) {
      const studyUid = (seriesData[value[0].seriesUid] as Series).studyUid;
      const filter = { studyUid };
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
    const newValue = produce(value, value => {
      value[volumeId].partialVolumeDescriptor = descriptor;
    });
    onChange(newValue);
  };

  const handleSeriesRegister = async (seriesUid: string) => {
    if (value.some(s => s.seriesUid === seriesUid)) {
      if (!(await confirm('Add the same series?'))) return;
    }
    const newEntry: SeriesEntry = {
      seriesUid,
      partialVolumeDescriptor: undefined
    };
    onChange([...value, newEntry]);
  };

  const handleSeriesRemove = (index: number) => {
    if (value.length <= 1) return;
    onChange(
      produce(value, value => {
        value.splice(index, 1);
      })
    );
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
      renderer: ({ value }) => <>{seriesData[value.seriesUid]?.modality}</>
    },
    {
      key: 'seriesDescription',
      caption: 'Series Desc',
      renderer: ({ value }) => (
        <>{seriesData[value.seriesUid]?.seriesDescription}</>
      )
    },
    {
      key: 'seriesUid',
      caption: 'Series UID',
      renderer: ({ value }) => <SeriesUidSpan>{value.seriesUid}</SeriesUidSpan>
    },
    {
      key: 'seriesDate',
      caption: 'Series Date',
      renderer: ({ value }) =>
        seriesData[value.seriesUid] ? (
          <TimeDisplay value={seriesData[value.seriesUid]!.seriesDate} />
        ) : null
    },
    {
      key: 'images',
      caption: 'Images',
      renderer: ({ value }) => <>{seriesData[value.seriesUid]?.images}</>
    },
    {
      key: 'pvd',
      caption: 'Range',
      renderer: ({ value, index }) =>
        seriesData[value.seriesUid] ? (
          <PartialVolumeRenderer
            value={value.partialVolumeDescriptor}
            images={seriesData[value.seriesUid]!.images}
            index={index}
            onChange={handlePartialVolumeChange}
          />
        ) : null
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
          {!alwaysShowRelevaltSeries && (
            <IconButton
              icon={showRelevantSeries ? 'chevron-up' : 'plus'}
              bsSize="sm"
              onClick={handleAddSeriesClick}
            >
              {showRelevantSeries ? 'Close' : 'Add Series'}
            </IconButton>
          )}
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
