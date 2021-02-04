import IconButton from './IconButton';
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { useApi } from 'utils/api';
import { Modal, Button, ProgressBar } from './react-bootstrap';

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

  const handleDownloadClick = async () => {
    setCloseTitle('Close');
    await api(`/tasks/${taskId}/download`);
  };

  const dialog = (
    <Modal.Dialog>
      <Modal.Header>
        <Modal.Title>Export {caption}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Voxel label output type:
        <label>
          <input
            type="checkbox"
            onChange={() => setCombinedMode(x => !x)}
            disabled={!!taskId}
            checked={combinedMode}
          />{' '}
          Combined
        </label>
        {!taskId && (
          <div>
            <ProgressBar now={0} />
            <Button bsStyle="primary" onClick={handleStartClick}>
              Start download...
            </Button>
          </div>
        )}
        {taskProgress?.status === 'processing' && (
          <div>
            <ProgressBar
              active
              bsStyle="success"
              now={taskProgress.finished}
              max={taskProgress.total}
            />
            <Button bsStyle="primary" disabled>
              Please wait...
            </Button>
            <div>{taskProgress.message}</div>
          </div>
        )}
        {taskProgress?.status === 'error' && (
          <div className="alert alert-danger">{taskProgress.message}</div>
        )}
        {taskProgress?.status === 'finished' && (
          <div>
            <div className="text-success">Export finished.</div>
            <IconButton
              bsSize="sm"
              bsStyle="success"
              icon="glyphicon-download"
              onClick={handleDownloadClick}
            >
              Download
            </IconButton>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="default" onClick={onClose}>
          {closeTitle}
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );

  return createPortal(dialog, modalRoot.current);
};

export default CaseExportModal;
