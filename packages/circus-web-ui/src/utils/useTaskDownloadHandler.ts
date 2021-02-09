import { useCallback } from 'react';
import { useApi } from './api';

/**
 * Returns a new mouse event handler that triggers a download from a task.
 * This still does not support large files (> 1GB).
 * @param taskId The task ID.
 */
const useTaskDownloadHandler = (taskId: string) => {
  const api = useApi();

  const cb = useCallback(async () => {
    const blob = await api(`tasks/${taskId}/download`, {
      responseType: 'blob'
    });
    const a = document.createElement('a');
    document.body.appendChild(a);
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = 'export.zip';
    a.click();
    window.URL.revokeObjectURL(url);
  }, [api, taskId]);

  return cb;
};

export default useTaskDownloadHandler;
