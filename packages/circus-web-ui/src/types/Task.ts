export default interface Task {
  taskId: string;
  name: string;
  status: 'finished' | 'error' | 'processing';
  finishedMessage: string | null;
  endedAt: string;
  errorMessage: string | null;
  downloadFileType?: string;
  dismissed: boolean;
  createdAt: string;
  updatedAt: string;
}
