import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { useApi } from 'utils/api';
import { Modal, Button, ProgressBar } from './react-bootstrap';
import classnames from 'classnames';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import useTaskDownloadHandler from 'utils/useTaskDownloadHandler';
import Icon from './Icon';

const CaseExportModal: React.FC<{
  caseIds: string[];
  onClose: () => void;
}> = props => {
  const { caseIds, onClose } = props;
  const [closeTitle, setCloseTitle] = useState('Cancel');
  const [combinedMode, setCombinedMode] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const api = useApi();
  const taskProgress = useSelector(state =>
    taskId ? state.taskProgress[taskId] : undefined
  );

  const caption = `${caseIds.length} case${caseIds.length !== 1 ? 's' : ''}`;

  const downloadTask = useTaskDownloadHandler(taskId!);

  const modalRoot = useRef<HTMLDivElement>(document.createElement('div'));

  useEffect(() => {
    document.body.appendChild(modalRoot.current);
    () => {
      document.body.removeChild(modalRoot.current);
    };
  }, []);

  const handleStartClick = async () => {
    const res = await api(`/cases/${caseIds[0]}/export-mhd`);
    setCloseTitle('Dismiss');
    setTaskId(res.taskId);
  };

  const handleDownloadClick = () => {
    setCloseTitle('Close');
    downloadTask();
  };

  const dialog = (
    <Modal.Dialog>
      <Modal.Header>
        <Modal.Title>Export {caption}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <label>
          <input
            type="checkbox"
            onChange={() => setCombinedMode(x => !x)}
            disabled={!!taskId}
            checked={combinedMode}
          />{' '}
          Combine labels
        </label>
        <div>
          <ProgressBar
            active={taskProgress?.status === 'processing'}
            bsStyle={taskProgress?.status === 'error' ? 'danger' : 'success'}
            now={
              taskProgress
                ? taskProgress.status === 'processing'
                  ? Math.max(1, taskProgress.finished ?? 0)
                  : 100
                : 0
            }
            max={taskProgress?.total ?? 100}
          />
        </div>
        <div
          className={classnames('message', {
            'text-mute': !taskProgress,
            'text-danger': taskProgress?.status === 'error',
            'text-success': taskProgress?.status === 'finished'
          })}
        >
          {taskProgress?.message ?? 'Not started'}
        </div>
      </Modal.Body>
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

export default CaseExportModal;
