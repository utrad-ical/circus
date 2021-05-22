import { Editor } from '@smikitky/rb-components/lib/editor-types';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import classnames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import useTaskDownloadHandler from 'utils/useTaskDownloadHandler';
import Icon from './Icon';
import { Button, Modal, ProgressBar } from './react-bootstrap';

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

  const modalRoot = useRef<HTMLDivElement>(document.createElement('div'));

  useEffect(() => {
    document.body.appendChild(modalRoot.current);
    () => {
      document.body.removeChild(modalRoot.current);
    };
  }, []);

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

  const dialog = (
    <Modal.Dialog>
      <Modal.Header>
        <Modal.Title>{caption}</Modal.Title>
      </Modal.Header>
      <StyledModalBody>
        <OptionsEditor value={options} onChange={handleOptionsChange} />
        <div className="row">
          <ProgressBar
            active={taskProgress?.status === 'processing'}
            bsStyle={taskProgress?.status === 'error' ? 'danger' : 'success'}
            now={
              taskProgress
                ? taskProgress.status === 'processing'
                  ? Math.max(1, taskProgress.finished ?? 100)
                  : 100
                : 0
            }
            max={taskProgress?.total ?? 100}
          />
        </div>
        <div
          className={classnames('message', 'row', {
            'text-mute': !taskProgress,
            'text-danger': taskProgress?.status === 'error',
            'text-success': taskProgress?.status === 'finished'
          })}
        >
          {taskProgress?.message ?? 'Not started'}
        </div>
      </StyledModalBody>
      <Modal.Footer>
        <Button bsStyle="default" onClick={onClose}>
          {closeTitle}
        </Button>
        {!taskProgress && (
          <Button bsStyle="primary" onClick={handleStartClick}>
            Start download
          </Button>
        )}
        {taskProgress?.status === 'processing' && (
          <Button bsStyle="primary" disabled>
            <LoadingIndicator /> Please wait...
          </Button>
        )}
        {taskProgress?.status === 'finished' && (
          <Button bsStyle="success" onClick={handleDownloadClick}>
            <Icon icon="glyphicon-download" />
            Download
          </Button>
        )}
      </Modal.Footer>
    </Modal.Dialog>
  );

  return createPortal(dialog, modalRoot.current);
};

const StyledModalBody = styled(Modal.Body)`
  .row {
    margin: 8px 0;
  }
`;

export default DownloadModal;
