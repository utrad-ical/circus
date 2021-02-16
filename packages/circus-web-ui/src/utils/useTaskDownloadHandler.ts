import { useCallback } from 'react';
import { useApi } from './api';
import streamSaver from 'streamsaver';

/**
 * Returns a new mouse event handler that triggers a download from a task.
 * This still does not support large files (> 1GB).
 * @param taskId The task ID.
 */
const useTaskDownloadHandler = (taskId: string) => {
  const api = useApi();

  const cb = useCallback(async () => {
    const response = await fetch(
      api.getBaseUrl() + `tasks/${taskId}/download`,
      {
        headers: { Authorization: `Bearer ${api.getToken()}` }
      }
    );
    const size = Number(response.headers.get('content-length')) || undefined;
    const cd = response.headers.get('content-deposition');
    const fileName = cd?.match(/filename="(.+)"/)?.[1] ?? 'download';
    const fileStream = streamSaver.createWriteStream(fileName, {
      size
    });
    response.body?.pipeTo(fileStream);
  }, [api, taskId]);

  return cb;
};

export default useTaskDownloadHandler;
