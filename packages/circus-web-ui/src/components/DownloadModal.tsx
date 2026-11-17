import styles from './DownloadModal.module.css';
import Button from '#components/Button.tsx';
import type { Editor } from '#components/editorTypes.tsx';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import React, { useEffect, useState } from 'react';
import { api } from '#utils/api.ts';
import useProgress from '#utils/useProgress.ts';
import { DialogBody, DialogFooter, DialogHeader } from './Dialog.tsx';
import ProgressView from './ProgressView.tsx';

export type CompressionFormat = 'tgz' | 'zip';

export const compressionFormatOptions: {
  [type in CompressionFormat]: string;
} = {
  tgz: 'tar.gz',
  zip: 'zip'
};

export type LineEnding = 'lf' | 'crlf';

export const lineEndingOptions: { [type in LineEnding]: string } = {
  lf: 'LF',
  crlf: 'CR + LF (Windows)'
};

/**
 * Lets the browser download the URL.
 * Authenticated with the session cookie; the browser streams the file.
 */
const downloadUrl = (url: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  a.click();
};

const DownloadModal = <T extends any>(props: {
  onClose: () => void;
  initialOptions: T;
  optionsEditor: Editor<T>;
  /**
   * Returns the URL to download.
   * The URL gets `progressId` to report the progress.
   */
  onStart: (options: T) => Promise<string>;
  /** Whether the download can start with the options */
  canStart?: (options: T) => boolean;
  caption: React.ReactChild;
}): React.ReactElement => {
  const {
    onClose,
    caption,
    onStart,
    canStart,
    optionsEditor: OptionsEditor,
    initialOptions
  } = props;
  const [closeTitle, setCloseTitle] = useState('Cancel');
  const [options, setOptions] = useState(initialOptions);
  const [progressId, setProgressId] = useState<string | null>(null);
  const progress = useProgress(progressId);

  useEffect(() => {
    if (progress?.status === 'finished') setCloseTitle('Close');
  }, [progress?.status]);

  const handleOptionsChange = (value: T) => {
    setOptions(value);
  };

  const handleStartClick = async () => {
    const startUrl = await onStart(options);
    setCloseTitle('Dismiss');
    const { progressId } = await api('progress', {
      method: 'post',
      data: {}
    });
    setProgressId(progressId);
    const url = new URL(startUrl, window.location.href);
    url.searchParams.set('progressId', progressId);
    downloadUrl(url.href);
  };

  return (
    <>
      <DialogHeader>{caption}</DialogHeader>
      <DialogBody>
        {/* The options cannot be changed after the download starts */}
        <fieldset className={styles.options} disabled={!!progress}>
          <OptionsEditor value={options} onChange={handleOptionsChange} />
        </fieldset>
        <ProgressView progress={progress} />
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>{closeTitle}</Button>
        {!progress && (
          <Button
            variant="primary"
            onClick={handleStartClick}
            disabled={canStart && !canStart(options)}
          >
            Start download
          </Button>
        )}
        {progress?.status === 'processing' && (
          <Button variant="primary" disabled>
            <LoadingIndicator /> Please wait...
          </Button>
        )}
      </DialogFooter>
    </>
  );
};

export default DownloadModal;
