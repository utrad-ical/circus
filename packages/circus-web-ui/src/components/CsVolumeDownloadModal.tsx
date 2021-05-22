import { Editor } from '@smikitky/rb-components/lib/editor-types';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useApi } from 'utils/api';
import fillPartialVolumeDescriptors from 'utils/partialVolumeDescriptor';
import DownloadModal from './DownloadModal';
import { SeriesEntry } from './SeriesSelector';

type Format = 'tgz' | 'zip';

interface CsVolumeDownloadOptions {
  series: SeriesEntry[];
  format: Format;
}

// const formatOptions: { [type in Format]: string } = {
//   tgz: 'tar + gzip',
//   zip: 'zip'
// };

const CsVolumeDoanloadOptionsEditor: Editor<CsVolumeDownloadOptions> = props => {
  const { value, onChange } = props;
  // Currently no option is available
  return (
    <div>
      Exporting{' '}
      {value.series.length > 1
        ? `${value.series.length} volumes`
        : `one volume`}
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
          )
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
      initialOptions={{ series, format: 'tgz' }}
      optionsEditor={CsVolumeDoanloadOptionsEditor}
    />
  );
};

export default CsVolumeDownloadModal;
