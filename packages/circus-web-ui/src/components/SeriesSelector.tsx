import Panel, { PanelHeader, PanelBody } from '#components/Panel.tsx';
import Button from '#components/Button.tsx';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import { confirm, modal } from '#components/dialogs.tsx';
import Select from '#components/Select.tsx';
import type { PartialVolumeDescriptor } from '@utrad-ical/circus-rs';
import { describePartialVolumeDescriptor } from '@utrad-ical/circus-rs';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import SearchResultsView from '#components/SearchResultsView.tsx';
import { produce } from 'immer';
import * as mr from 'multi-integer-range';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { newSearch } from '#store/searches.ts';
import type Series from '#types/Series.ts';
import { api } from '#utils/api.ts';
import { UidDisplay } from '../pages/search/SearchResultRenderer.tsx';
import PartialVolumeDescriptorEditor from './PartialVolumeDescriptorEditor.tsx';
import styles from './SeriesSelector.module.css';
import TimeDisplay from './TimeDisplay.tsx';

const PartialVolumeRenderer: React.FC<{
  index: number;
  value: PartialVolumeDescriptor | 'auto';
  images: string; // multi-integer-range string (eg '1-20,30')
  onClick: () => void;
}> = props => {
  const { value, images, onClick } = props;
  const applied = value !== 'auto';

  return (
    <Button
      icon="material-edit_square"
      size="xsmall"
      onClick={onClick}
      variant={applied ? 'primary' : 'default'}
    >
      {applied ? describePartialVolumeDescriptor(value!, 3) : 'auto'}
    </Button>
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
            <Button
              icon="material-keyboard_arrow_up"
              size="xsmall"
              variant="primary"
              onClick={() => onSeriesRegister(value.seriesUid, value.studyUid)}
            >
              Add
            </Button>
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
  partialVolumeDescriptor: PartialVolumeDescriptor | 'auto';
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
  }, [searchedSeries, seriesData, value]);

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
      newSearch('relevantSeries', {
        resource: { endPoint: 'series', primaryKey: 'seriesUid' },
        filter,
        condition: {},
        sort: '{"seriesDate":-1}'
      })
    );
  }, [dispatch, primarySeries, showRelevantSeries, seriesSearchTarget]);

  const handleAddSeriesClick = () => {
    setShowRelevantSeries(s => !s);
  };

  const handlePvdButtonClick = async (index: number) => {
    if (onPvdEditing && !(await onPvdEditing(index))) return;
    const seriesUid = value[index].seriesUid;
    const images = mr.initialize(seriesData[seriesUid]?.images);
    const result = (await modal(
      (props: any) => (
        <PartialVolumeDescriptorEditor
          initialValue={
            typeof value[index].partialVolumeDescriptor === 'object'
              ? value[index].partialVolumeDescriptor
              : { start: mr.min(images), end: mr.max(images), delta: 1 }
          }
          images={images}
          {...props}
        />
      ),
      {}
    )) as { descriptor: PartialVolumeDescriptor | null } | null;
    if (!result) return; // dialog cancelled

    onChange(
      produce(value, value => {
        value[index].partialVolumeDescriptor = result.descriptor || 'auto';
      })
    );
  };

  const handleSeriesRegister = async (seriesUid: string, studyUid: string) => {
    if (value.some(s => s.seriesUid === seriesUid)) {
      if (primarySeries!.studyUid !== studyUid) {
        if (!(await confirm('Add the same series with a different Study UID?')))
          return;
      }
      if (!(await confirm('Add the same series?'))) return;
    } else if (primarySeries!.studyUid !== studyUid) {
      if (!(await confirm('Add the series with a different Study UID?')))
        return;
    }
    const newEntry: SeriesEntry = {
      seriesUid,
      partialVolumeDescriptor: 'auto'
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
      renderer: ({ value }) => (
        <span className={styles.seriesUid}>{value.seriesUid}</span>
      )
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
        <Button
          size="xsmall"
          icon="material-close"
          onClick={() => handleSeriesRemove(index)}
        />
      )
    }
  ];

  return (
    <Panel>
      <PanelHeader>Series</PanelHeader>
      <PanelBody>
        <DataGrid columns={columns} value={value} />
        <div className={styles.selectAdditionalSeries}>
          {!alwaysShowRelevantSeries && (
            <Button
              icon={
                showRelevantSeries
                  ? 'material-keyboard_arrow_up'
                  : 'material-add'
              }
              size="small"
              onClick={handleAddSeriesClick}
            >
              {showRelevantSeries ? 'Close' : 'Add Series'}
            </Button>
          )}
          {showRelevantSeries && (
            <>
              <span>Showing series from</span>
              <Select
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
        </div>
        {showRelevantSeries &&
          primarySeries &&
          (seriesSearchTarget === 'studyUid' || primarySeries.patientInfo ? (
            <RelevantSeries onSeriesRegister={handleSeriesRegister} />
          ) : (
            <span className={styles.warningMessage}>
              You don&rsquo;t have permission to access personal information.
            </span>
          ))}
      </PanelBody>
    </Panel>
  );
};

export default SeriesSelector;
