import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { useApi } from 'utils/api';
import { Modal, Button, ProgressBar } from './react-bootstrap';
import classnames from 'classnames';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import useTaskDownloadHandler from 'utils/useTaskDownloadHandler';
import Icon from './Icon';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import styled from 'styled-components';

const labelPackTypeOptions = {
  isolated: 'Isolated (one raw file per label)',
  combined: 'Combined'
};
const mhdLineEndingOptions = { lf: 'LF', crlf: 'CR + LF (Windows)' };

const CaseExportModal: React.FC<{
  caseIds: string[];
  onClose: () => void;
}> = props => {
  const { caseIds, onClose } = props;
  const [closeTitle, setCloseTitle] = useState('Cancel');
  const [labelPackType, setLabelPackType] = useState<'combined' | 'isolated'>(
    'isolated'
  );
  const [mhdLineEnding, setMhdLineEnding] = useState('lf');
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
    const res = await api(`/cases/export-mhd`, {
      method: 'post',
      data: { caseIds, labelPackType, mhdLineEnding }
    });
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
      <StyledModalBody>
        <div className="row">
          Voxel labels:{' '}
          <ShrinkSelect
            options={labelPackTypeOptions}
            value={labelPackType}
            onChange={setLabelPackType}
          />
        </div>
        <div className="row">
          MHD file line endings:{' '}
          <ShrinkSelect
            options={mhdLineEndingOptions}
            value={mhdLineEnding}
            onChange={setMhdLineEnding}
          />
        </div>
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

export default CaseExportModal;
