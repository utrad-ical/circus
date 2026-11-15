import { useCallback } from 'react';
import { api } from './api.ts';

/**
 * Lets the browser download the URL.
 * Authenticated with the session cookie; the browser streams the file.
 */
export const downloadUrl = (url: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  a.click();
};

/**
 * Returns a new mouse event handler that triggers a download from a task.
 * @param taskId The task ID.
 */
const useTaskDownloadHandler = (taskId: string) => {
  return useCallback(() => {
    downloadUrl(api.getBaseUrl() + `tasks/${taskId}/download`);
  }, [taskId]);
};

export default useTaskDownloadHandler;
