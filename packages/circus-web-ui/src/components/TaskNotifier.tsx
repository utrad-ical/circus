import Button from '#components/Button.tsx';
import classNames from 'classnames';
import moment from 'moment';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { newSearch, updateSearch } from '#store/searches.ts';
import type Task from '#types/Task.ts';
import { useApi } from '#utils/api.ts';
import useTaskDismisser from '#utils/useTaskDismisser.ts';
import useTaskDownloadHandler from '#utils/useTaskDownloadHandler.ts';
import type { TaskProgress } from '../store/taskProgress.ts';
import NavMenu from './NavMenu.tsx';
import ProgressBar from './ProgressBar.tsx';
import styles from './TaskNotifier.module.css';

const TaskNotifier: React.FC<{}> = props => {
  const api = useApi();
  const dismissTask = useTaskDismisser();
  const dispatch = useDispatch();

  // This contains task progress sent from the SSE endpoint
  const taskProgress = useSelector(state => state.taskProgress);
  const taskDic = useSelector(state => state.searches.items.tasks);
  const taskSearch = useSelector(
    state => state.searches.searches.undismissedTasks
  );
  const tasks = taskSearch?.results?.indexes
    .map(taskId => taskDic[taskId])
    .filter(task => !task.dismissed);

  useEffect(() => {
    dispatch(
      newSearch(api, 'undismissedTasks', {
        filter: { dismissed: false },
        condition: { dismissed: false },
        resource: { endPoint: 'tasks', primaryKey: 'taskId' },
        sort: '{"createdAt":-1}'
      })
    );
  }, [api, dispatch]);

  useEffect(() => {
    if (
      tasks &&
      !taskSearch.isFetching &&
      Object.entries(taskProgress).some(
        ([taskId, task]) =>
          task.status === 'processing' && !tasks.find(t => t.taskId === taskId)
      )
    ) {
      // A new task has been registered
      dispatch(updateSearch(api, 'undismissedTasks', {}));
    }
  });

  if (!tasks) return null;

  const inProgress = Object.values(taskProgress).some(
    v => v.status === 'processing'
  );

  const handleDismissClick = async (taskId: string) => {
    await dismissTask(taskId);
    dispatch(updateSearch(api, 'undismissedTasks', {}));
  };

  return (
    <NavMenu
      name=""
      icon="material-notifications"
      link="/task-list"
      align="end"
      className={classNames(styles.taskNotifier, {
        [styles.inProgress]: inProgress
      })}
    >
      {tasks.map(task => {
        const progress = taskProgress[task.taskId];
        return (
          <TaskDisplay
            key={task.taskId}
            task={task}
            onDismissClick={() => handleDismissClick(task.taskId)}
            progress={progress}
          />
        );
      })}
    </NavMenu>
  );
};

const TaskDisplay: React.FC<{
  task: Task;
  progress?: TaskProgress;
  onDismissClick: () => void;
}> = props => {
  const { task, progress, onDismissClick } = props;

  const handleDownloadClick = useTaskDownloadHandler(task.taskId);
  const status = progress?.status ?? task.status;
  const counted =
    typeof progress?.finished === 'number' &&
    typeof progress?.total === 'number';

  const message =
    progress?.message ??
    (task.status === 'finished'
      ? `Finished (${moment(task.endedAt).fromNow()})`
      : task.status === 'processing'
        ? 'In progress'
        : `Error (${moment(task.endedAt).fromNow()})`);

  return (
    <div
      className={classNames(styles.taskDisplay, {
        [styles.error]: status === 'error'
      })}
    >
      <div className={styles.main}>
        <div className={styles.info}>
          <div>{task.name}</div>
          <div className={styles.message}>{message}</div>
        </div>
        {task.downloadFileType && task.status === 'finished' && (
          <Button
            size="small"
            variant="primary"
            icon="material-arrow_circle_down"
            onClick={handleDownloadClick}
          />
        )}
        <Button
          title="Dismiss"
          onClick={onDismissClick}
          size="small"
          variant="primary"
          icon="material-select_check_box"
        />
      </div>
      <ProgressBar
        className={styles.progressbar}
        variant={
          status === 'error'
            ? 'danger'
            : status === 'finished'
              ? 'success'
              : undefined
        }
        value={
          status !== 'processing' ? 1 : counted ? progress!.finished : undefined
        }
        max={status === 'processing' && counted ? progress!.total : 1}
      />
    </div>
  );
};

export default TaskNotifier;
