import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
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
  onClick: () => void;
}> = props => {
  const { value, images, onClick } = props;
  const applied = !!value;

  return (
    <IconButton
      icon="edit"
      bsSize="xs"
      onClick={onClick}
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
  partialVolumeDescriptor?: PartialVolumeDescriptor;
}

const SeriesSelector: React.FC<{
  value: SeriesEntry[];
  onChange: any;
  onRemoving?: (index: number) => Promise<boolean>;
  onPvdEditing?: (index: number) => Promise<boolean>;
  alwaysShowRelevantSeries?: boolean;
}> = props => {
  const {
    value,
    onChange,
    onRemoving,
    onPvdEditing,
    alwaysShowRelevantSeries
  } = props;
  const [showRelevantSeries, setShowRelevantSeries] = useState(
    !!alwaysShowRelevantSeries
  );
  const api = useApi();
  const dispatch = useDispatch();
  const searchedSeries = useSelector(
    state => state.searches.items.series ?? {}
  );

  const [seriesData, setSeriesData] = useState<{
    [seriesUid: string]: Series | null; // null means "now loading"
  }>({});

  const primarySeries = value.length
    ? seriesData[value[0].seriesUid]
    : undefined;

  useEffect(() => {
    const loadSeriesData = async (seriesUid: string) => {
      if (seriesUid in seriesData) return;
      const data = searchedSeries[seriesUid];
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
  }, [api, searchedSeries, seriesData, value]);

  useEffect(() => {
    if (!showRelevantSeries || !primarySeries) return;
    const filter = { studyUid: primarySeries.studyUid };
    dispatch(
      newSearch(api, 'relevantSeries', {
        resource: { endPoint: 'series', primaryKey: 'seriesUid' },
        filter,
        condition: {},
        sort: '{}'
      })
    );
  }, [api, dispatch, primarySeries, showRelevantSeries]);

  const handleAddSeriesClick = () => {
    setShowRelevantSeries(s => !s);
  };

  const handlePvdButtonClick = async (index: number) => {
    if (onPvdEditing && !(await onPvdEditing(index))) return;
    const seriesUid = value[index].seriesUid;
    const mr = multirange(seriesData[seriesUid]?.images);
    const result = (await modal(
      (props: any) => (
        <PartialVolumeDescriptorEditor
          initialValue={
            value[index].partialVolumeDescriptor ?? {
              start: mr.min(),
              end: mr.max(),
              delta: 1
            }
          }
          images={mr}
          {...props}
        />
      ),
      {}
    )) as { descriptor: PartialVolumeDescriptor | null } | null;
    if (!result) return; // dialog cancelled

    onChange(
      produce(value, value => {
        value[index].partialVolumeDescriptor = result.descriptor || undefined;
      })
    );
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

  const handleSeriesRemove = async (index: number) => {
    if (value.length <= 1) return;
    if (onRemoving && !(await onRemoving(index))) return;
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
      renderer: ({ index }) => <>{index}</>
    },
    {
      key: 'modality',
      caption: 'Modality',
      renderer: ({ value }) => (
        <>{seriesData[value.seriesUid]?.modality ?? <LoadingIndicator />}</>
      )
    },
    {
      key: 'seriesDescription',
      caption: 'Series Desc',
      renderer: ({ value }) => (
        <>
          {seriesData[value.seriesUid]?.seriesDescription ?? (
            <LoadingIndicator />
          )}
        </>
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
        ) : (
          <LoadingIndicator />
        )
    },
    {
      key: 'images',
      caption: 'Images',
      renderer: ({ value }) => (
        <>{seriesData[value.seriesUid]?.images ?? <LoadingIndicator />}</>
      )
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
            onClick={() => handlePvdButtonClick(index)}
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
          {!alwaysShowRelevantSeries && (
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
