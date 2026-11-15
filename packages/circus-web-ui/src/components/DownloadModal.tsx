import Button from '#components/Button.tsx';
import type { Editor } from '#components/editorTypes.tsx';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { api } from '#utils/api.ts';
import useProgress from '#utils/useProgress.ts';
import useTaskDownloadHandler, {
  downloadUrl
} from '#utils/useTaskDownloadHandler.ts';
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
 * What `onStart` returns: a task ID (deprecated) or the URL to download.
 * The URL gets `progressId` to report the progress.
 */
export type DownloadStart = string | { url: string };

const DownloadModal = <T extends any>(props: {
  onClose: () => void;
  initialOptions: T;
  optionsEditor: Editor<T>;
  onStart: (options: T) => Promise<DownloadStart>;
  caption: React.ReactChild;
}): React.ReactElement => {
  const {
    onClose,
    caption,
    onStart,
    optionsEditor: OptionsEditor,
    initialOptions
  } = props;
  const [closeTitle, setCloseTitle] = useState('Cancel');
  const [options, setOptions] = useState(initialOptions);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progressId, setProgressId] = useState<string | null>(null);
  const taskProgress = useSelector(state =>
    taskId ? state.taskProgress[taskId] : undefined
  );
  const streamProgress = useProgress(progressId);
  const progress = taskId ? taskProgress : streamProgress;

  const downloadTask = useTaskDownloadHandler(taskId!);

  useEffect(() => {
    if (progressId && progress?.status === 'finished') setCloseTitle('Close');
  }, [progressId, progress?.status]);

  const handleOptionsChange = (value: T) => {
    setOptions(value);
  };

  const handleStartClick = async () => {
    const start = await onStart(options);
    setCloseTitle('Dismiss');
    if (typeof start === 'string') {
      setTaskId(start);
      return;
    }
    const { progressId } = await api('progress', {
      method: 'post',
      data: {}
    });
    setProgressId(progressId);
    const url = new URL(start.url, window.location.href);
    url.searchParams.set('progressId', progressId);
    downloadUrl(url.href);
  };

  const handleDownloadClick = () => {
    setCloseTitle('Close');
    downloadTask();
  };

  return (
    <>
      <DialogHeader>{caption}</DialogHeader>
      <DialogBody>
        <OptionsEditor value={options} onChange={handleOptionsChange} />
        <ProgressView progress={progress} />
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>{closeTitle}</Button>
        {!progress && (
          <Button variant="primary" onClick={handleStartClick}>
            Start download
          </Button>
        )}
        {progress?.status === 'processing' && (
          <Button variant="primary" disabled>
            <LoadingIndicator /> Please wait...
          </Button>
        )}
        {taskId && progress?.status === 'finished' && (
          <Button
            variant="primary"
            onClick={handleDownloadClick}
            icon="material-arrow_circle_down"
          >
            Download
          </Button>
        )}
      </DialogFooter>
    </>
  );
};

export default DownloadModal;
