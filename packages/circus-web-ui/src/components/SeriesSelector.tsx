import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { confirm, modal } from '@smikitky/rb-components/lib/modal';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import IconButton from 'components/IconButton';
import { Panel } from 'components/react-bootstrap';
import SearchResultsView from 'components/SearchResultsView';
import produce from 'immer';
import { multirange } from 'multi-integer-range';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { newSearch } from 'store/searches';
import styled from 'styled-components';
import Series from 'types/Series';
import { useApi } from 'utils/api';
import { UidDisplay } from '../pages/search/SeriesSearchResults';
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
  onSeriesRegister: (seriesUid: string, studyUid: string) => void;
}> = props => {
  const { onSeriesRegister } = props;

  const RelevantSeriesDataView: React.FC<any> = useMemo(
    () => props => {
      const { value } = props;
      const columns: DataGridColumnDefinition<any>[] = [
        { key: 'modality', caption: 'Modality' },
        { key: 'seriesDescription', caption: 'Series Desc' },
        { key: 'Uid', caption: 'UID', renderer: UidDisplay },
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
              onClick={() => onSeriesRegister(value.seriesUid, value.studyUid)}
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
  onChange: (value: SeriesEntry[]) => void;
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
  const [seriesSearchTarget, setSeriesSearchTarget] = useState<
    'studyUid' | 'patientId'
  >('studyUid');
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
    if (seriesSearchTarget === 'patientId' && !primarySeries.patientInfo) {
      return;
    }
    const filter =
      seriesSearchTarget === 'patientId'
        ? {
            'patientInfo.patientId': primarySeries.patientInfo!.patientId
          }
        : {
            studyUid: primarySeries.studyUid
          };
    dispatch(
      newSearch(api, 'relevantSeries', {
        resource: { endPoint: 'series', primaryKey: 'seriesUid' },
        filter,
        condition: {},
        sort: '{"seriesDate":-1}'
      })
    );
  }, [api, dispatch, primarySeries, showRelevantSeries, seriesSearchTarget]);

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

  const handleSeriesRegister = async (seriesUid: string, studyUid: string) => {
    if (value.some(s => s.seriesUid === seriesUid)) {
      if (primarySeries!.studyUid !== studyUid) {
        if (!(await confirm('Add the same series with a different studyUid?')))
          return;
      }
      if (!(await confirm('Add the same series?'))) return;
    } else if (primarySeries!.studyUid !== studyUid) {
      if (!(await confirm('Add the series with a different studyUid?'))) return;
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
    <Panel>
      <Panel.Heading>Series</Panel.Heading>
      <Panel.Body>
        <DataGrid columns={columns} value={value} />
        <SelectAdditionalSeriesDiv>
          {!alwaysShowRelevantSeries && (
            <IconButton
              icon={showRelevantSeries ? 'chevron-up' : 'plus'}
              bsSize="sm"
              onClick={handleAddSeriesClick}
            >
              {showRelevantSeries ? 'Close' : 'Add Series'}
            </IconButton>
          )}
          {showRelevantSeries && (
            <>
              <span>Showing series from</span>
              <ShrinkSelect
                options={{
                  studyUid: 'the same study',
                  patientId: 'the same patient'
                }}
                value={seriesSearchTarget}
                onChange={key => {
                  setSeriesSearchTarget(key);
                }}
              />
            </>
          )}
        </SelectAdditionalSeriesDiv>
        {showRelevantSeries &&
          primarySeries &&
          (seriesSearchTarget === 'studyUid' || primarySeries.patientInfo ? (
            <RelevantSeries onSeriesRegister={handleSeriesRegister} />
          ) : (
            <WarninMessageSpan>
              You don't have permission to access personal information.
            </WarninMessageSpan>
          ))}
      </Panel.Body>
    </Panel>
  );
};

const SeriesUidSpan = styled.span`
  font-size: 80%;
  word-break: break-all;
`;

const WarninMessageSpan = styled.span`
  display: block;
  text-align: center;
  margin: 1em;
`;

const SelectAdditionalSeriesDiv = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
`;

export default SeriesSelector;
