import { useDispatch } from 'react-redux';
import { api } from './api.ts';
import { dismissTask } from '#store/searches.ts';

const useTaskDismisser = () => {
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
