import styles from './DownloadModal.module.css';
import type { Editor } from '#components/editorTypes.tsx';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useApi } from '#utils/api.ts';
import fillPartialVolumeDescriptors from '#utils/partialVolumeDescriptor.ts';
import type { CompressionFormat } from './DownloadModal.tsx';
import DownloadModal, { compressionFormatOptions } from './DownloadModal.tsx';
import type { SeriesEntry } from './SeriesSelector.tsx';
import Select from '#components/Select.tsx';

interface CsVolumeDownloadOptions {
  series: SeriesEntry[];
  compressionFormat: CompressionFormat;
}

const CsVolumeDoanloadOptionsEditor: Editor<
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
  const api = useApi();
  const appState = useSelector(state => state);

  const onStart = useCallback(
    async (options: CsVolumeDownloadOptions) => {
      const res = await api('/series/export-cs-volume', {
        method: 'post',
        data: {
          series: await fillPartialVolumeDescriptors(
            options.series,
            api,
            appState
          ),
          compressionFormat: options.compressionFormat
        }
      });
      return res.taskId;
    },
    [api, appState]
  );

  return (
    <DownloadModal
      onClose={onClose}
      caption={caption}
      onStart={onStart}
      initialOptions={{ series, compressionFormat: 'tgz' }}
      optionsEditor={CsVolumeDoanloadOptionsEditor}
    />
  );
};

export default CsVolumeDownloadModal;
