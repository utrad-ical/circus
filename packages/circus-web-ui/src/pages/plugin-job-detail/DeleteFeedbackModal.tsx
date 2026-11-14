import u from '#components/utilities.module.css';
import Button from '#components/Button.tsx';
import type { FeedbackEntry } from '@utrad-ical/circus-ui-kit';
import { useCsResults } from '@utrad-ical/circus-ui-kit';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import Icon from '#components/Icon.tsx';
import { DialogBody, DialogHeader } from '#components/Dialog.tsx';
import TimeDisplay from '#components/TimeDisplay.tsx';
import UserDisplay from '#components/UserDisplay.tsx';
import React, { useCallback, useMemo, useState } from 'react';
import { api } from '#utils/api.ts';
import * as modal from '#components/dialogs.tsx';

const DeleteFeedbackModal: React.FC<{}> = () => {
  const { job } = useCsResults();
  const { jobId, feedbacks } = job;

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
    [jobId]
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
            variant="danger"
            size="small"
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
      <DialogHeader>
        <Icon icon="material-close" /> Delete Feedback
      </DialogHeader>
      <DialogBody>
        {feedbacks.length > 0 ? (
          <>
            <div className={u.danger}>
              <Icon icon="material-warning" />
              You cannot restore feedback once deleted.
            </div>
            <hr />
            Delete indicivdual feedback:
            <DataGrid<FeedbackEntry<any>> columns={columns} value={feedbacks} />
            <hr />
            Delete <b>all</b> feedback for this job:{' '}
            <Button variant="danger" onClick={() => handleDeleteFb('all')}>
              Delete
            </Button>
          </>
        ) : (
          <>
            <div className={u.info}>
              There is no feedback data for this job.
            </div>
          </>
        )}
      </DialogBody>
    </>
  );
};

export default DeleteFeedbackModal;
