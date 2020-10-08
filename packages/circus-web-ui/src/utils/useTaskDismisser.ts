import { useDispatch } from 'react-redux';
import { useApi } from './api';
import { dismissTask } from 'store/searches';

const useTaskDismisser = () => {
  const api = useApi();
  const dispatch = useDispatch();
  return async (taskId: string) => {
    await api(`/tasks/${taskId}`, {
      method: 'patch',
      data: { dismissed: true }
    });
    dispatch(dismissTask(taskId));
  };
};

export default useTaskDismisser;
