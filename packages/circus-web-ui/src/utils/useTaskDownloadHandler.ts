import { useCallback } from 'react';
import { api } from './api.ts';

/**
 * Returns a new mouse event handler that triggers a download from a task.
 * @param taskId The task ID.
 */
const useTaskDownloadHandler = (taskId: string) => {
  return useCallback(() => {
    // Authenticated with the session cookie; the browser streams the file
    const a = document.createElement('a');
    a.href = api.getBaseUrl() + `tasks/${taskId}/download`;
    a.download = '';
    a.click();
  }, [taskId]);
};

export default useTaskDownloadHandler;
