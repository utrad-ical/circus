import styles from './DownloadModal.module.css';
import u from '#components/utilities.module.css';
import type { Editor } from '#components/editorTypes.tsx';
import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { api } from '#utils/api.ts';
import fillPartialVolumeDescriptors from '#utils/partialVolumeDescriptor.ts';
import type { CompressionFormat } from './DownloadModal.tsx';
import DownloadModal, { compressionFormatOptions } from './DownloadModal.tsx';
import SeriesSelector, { type SeriesEntry } from './SeriesSelector.tsx';
import Select from '#components/Select.tsx';

// The limit of the API
const maxSeries = 10;

interface CsVolumeDownloadOptions {
  series: SeriesEntry[];
  compressionFormat: CompressionFormat;
}

const createOptionsEditor = (
  editableSeries: boolean
): Editor<CsVolumeDownloadOptions> => {
  const CsVolumeDownloadOptionsEditor: Editor<
    CsVolumeDownloadOptions
  > = props => {
    const { value, onChange } = props;
    return (
      <div>
        Exporting{' '}
        {value.series.length !== 1
          ? `${value.series.length} volumes`
          : `one volume`}
        {value.series.length > maxSeries && (
          <span className={u.danger}>
            {' '}
            (up to {maxSeries} volumes can be exported)
          </span>
        )}
        <div className={styles.option}>
          Compression format:{' '}
          <Select
            options={compressionFormatOptions}
            value={value.compressionFormat}
            onChange={v => onChange({ ...value, compressionFormat: v })}
          />
        </div>
        {editableSeries && (
          <SeriesSelector
            value={value.series}
            onChange={series => onChange({ ...value, series })}
            collapsible
          />
        )}
      </div>
    );
  };
  return CsVolumeDownloadOptionsEditor;
};

const CsVolumeDownloadModal: React.FC<{
  series: SeriesEntry[];
  onClose: () => void;
  /** Lets the user add series and change them */
  editableSeries?: boolean;
}> = props => {
  const { onClose, series, editableSeries = false } = props;
  const caption = `Download volume for plug-in`;
  const appState = useSelector(state => state);
  const OptionsEditor = useMemo(
    () => createOptionsEditor(editableSeries),
    [editableSeries]
  );

  const onStart = useCallback(
    async (options: CsVolumeDownloadOptions) => {
      const series = await fillPartialVolumeDescriptors(
        options.series,
        appState
      );
      const params = new URLSearchParams({
        // `uid:start:end:delta`
        series: series
          .map(({ seriesUid, partialVolumeDescriptor: pvd }) =>
            pvd && pvd !== 'auto'
              ? [seriesUid, pvd.start, pvd.end, pvd.delta].join(':')
              : seriesUid
          )
          .join(','),
        compressionFormat: options.compressionFormat
      });
      return { url: api.getBaseUrl() + 'series/export-cs-volume?' + params };
    },
    [appState]
  );

  return (
    <DownloadModal
      onClose={onClose}
      caption={caption}
      onStart={onStart}
      initialOptions={{ series, compressionFormat: 'tgz' }}
      optionsEditor={OptionsEditor}
      canStart={options =>
        options.series.length > 0 && options.series.length <= maxSeries
      }
    />
  );
};

export default CsVolumeDownloadModal;
