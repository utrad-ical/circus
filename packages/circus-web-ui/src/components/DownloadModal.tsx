import styles from './DownloadModal.module.css';
import Button from '#components/Button.tsx';
import type { Editor } from '#components/editorTypes.tsx';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import classnames from 'classnames';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import useTaskDownloadHandler from '#utils/useTaskDownloadHandler.ts';
import { DialogBody, DialogFooter, DialogHeader } from './Dialog.tsx';
import ProgressBar from './ProgressBar.tsx';

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

const DownloadModal = <T extends any>(props: {
  onClose: () => void;
  initialOptions: T;
  optionsEditor: Editor<T>;
  onStart: (options: T) => Promise<string>;
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
  const taskProgress = useSelector(state =>
    taskId ? state.taskProgress[taskId] : undefined
  );

  const downloadTask = useTaskDownloadHandler(taskId!);

  const handleOptionsChange = (value: T) => {
    setOptions(value);
  };

  const handleStartClick = async () => {
    const taskId = await onStart(options);
    setCloseTitle('Dismiss');
    setTaskId(taskId);
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
        <div className={styles.option}>
          <ProgressBar
            variant={
              taskProgress?.status === 'error'
                ? 'danger'
                : taskProgress?.status === 'finished'
                  ? 'success'
                  : undefined
            }
            value={
              taskProgress
                ? taskProgress.status === 'processing'
                  ? taskProgress.finished
                  : (taskProgress.total ?? 100)
                : 0
            }
            max={taskProgress?.total ?? 100}
          />
        </div>
        <div
          className={classnames(styles.message, {
            [styles.muted]: !taskProgress,
            [styles.danger]: taskProgress?.status === 'error',
            [styles.success]: taskProgress?.status === 'finished'
          })}
        >
          {taskProgress?.message ?? 'Not started'}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>{closeTitle}</Button>
        {!taskProgress && (
          <Button variant="primary" onClick={handleStartClick}>
            Start download
          </Button>
        )}
        {taskProgress?.status === 'processing' && (
          <Button variant="primary" disabled>
            <LoadingIndicator /> Please wait...
          </Button>
        )}
        {taskProgress?.status === 'finished' && (
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
