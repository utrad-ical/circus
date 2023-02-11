import { FeedbackEntry, useCsResults } from '@utrad-ical/circus-ui-kit';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import Icon from 'components/Icon';
import { Button, Modal } from 'components/react-bootstrap';
import TimeDisplay from 'components/TimeDisplay';
import UserDisplay from 'components/UserDisplay';
import React, { useCallback, useMemo, useState } from 'react';
import { useApi } from 'utils/api';
import * as modal from '@smikitky/rb-components/lib/modal';

const DeleteFeedbackModal: React.FC<{}> = () => {
  const { job } = useCsResults();
  const { jobId, feedbacks } = job;
  const api = useApi();

  const handleDeleteFb = useCallback(
    async (target: string) => {
      const confirm = await modal.confirm(
        <span>
          Do you want to remove {target === 'all' ? <b>all</b> : <>this</>}{' '}
          feedback data?
        </span>
      );
      if (!confirm) return;
      try {
        await api(`plugin-jobs/${jobId}/feedback/${target}`, {
          method: 'DELETE',
          handleErrors: [400]
        });
        await modal.alert('Feedback deleted. Please refresh the page.');
      } catch (err: any) {
        await modal.alert(err.response.data.error);
      }
    },
    [api, jobId]
  );

  const hasConsensual = feedbacks.some(f => f.isConsensual);

  const columns: DataGridColumnDefinition<FeedbackEntry<any>>[] = useMemo(
    () => [
      {
        caption: 'Type',
        renderer: ({ value }) => (
          <>{value.isConsensual ? 'Consensual' : 'Personal'}</>
        )
      },
      {
        caption: 'Entered by',
        renderer: ({ value }) => <UserDisplay userEmail={value.userEmail} />
      },
      {
        caption: 'Entered at',
        renderer: ({ value }) => <TimeDisplay value={value.createdAt} />
      },
      {
        caption: 'Action',
        renderer: ({ value }) => (
          <Button
            onClick={() => handleDeleteFb(value.feedbackId)}
            bsStyle="danger"
            bsSize="small"
            disabled={!value.isConsensual && hasConsensual}
          >
            Delete
          </Button>
        )
      }
    ],
    [handleDeleteFb, hasConsensual]
  );

  return (
    <>
      <Modal.Header>
        <Icon icon="glyphicon-remove-sign" /> Delete Feedback
      </Modal.Header>
      <Modal.Body>
        {feedbacks.length > 0 ? (
          <>
            <div className="text-danger">
              <Icon icon="glyphicon-warning-sign" />
              You cannot restore feedback once deleted.
            </div>
            <hr />
            Delete indicivdual feedback:
            <DataGrid<FeedbackEntry<any>> columns={columns} value={feedbacks} />
            <hr />
            Delete <b>all</b> feedback for this job:{' '}
            <Button bsStyle="danger" onClick={() => handleDeleteFb('all')}>
              Delete
            </Button>
          </>
        ) : (
          <>
            <div className="text-info">
              There is no feedback data for this job.
            </div>
          </>
        )}
      </Modal.Body>
    </>
  );
};

export default DeleteFeedbackModal;
