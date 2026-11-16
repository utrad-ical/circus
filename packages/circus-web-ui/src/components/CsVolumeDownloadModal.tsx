import styles from './DownloadModal.module.css';
import type { Editor } from '#components/editorTypes.tsx';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { api } from '#utils/api.ts';
import fillPartialVolumeDescriptors from '#utils/partialVolumeDescriptor.ts';
import type { CompressionFormat } from './DownloadModal.tsx';
import DownloadModal, { compressionFormatOptions } from './DownloadModal.tsx';
import type { SeriesEntry } from './SeriesSelector.tsx';
import Select from '#components/Select.tsx';

interface CsVolumeDownloadOptions {
  series: SeriesEntry[];
  compressionFormat: CompressionFormat;
}

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
      <div className={styles.option}>
        Compression format:{' '}
        <Select
          options={compressionFormatOptions}
          value={value.compressionFormat}
          onChange={v => onChange({ ...value, compressionFormat: v })}
        />
      </div>
    </div>
  );
};

const CsVolumeDownloadModal: React.FC<{
  series: SeriesEntry[];
  onClose: () => void;
}> = props => {
  const { onClose, series } = props;
  const caption = `Download volume for plug-in`;
  const appState = useSelector(state => state);

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
      optionsEditor={CsVolumeDownloadOptionsEditor}
    />
  );
};

export default CsVolumeDownloadModal;
