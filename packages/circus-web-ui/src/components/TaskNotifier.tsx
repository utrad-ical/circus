import React, { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useApi } from 'utils/api';
import { CancelToken } from 'utils/cancelToken';
import useLoadData from 'utils/useLoadData';
import Icon from './Icon';
import { TaskProgress } from '../store/taskProgress';
import styled, { keyframes } from 'styled-components';
import IconButton from 'components/IconButton';
import moment from 'moment';
import classNames from 'classnames';

interface Task {
  taskId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  endedAt: string;
  errorMessage: string | null;
  finishedMessage: string | null;
  status: 'finished' | 'error' | 'processing';
  downloadFileType?: string;
}

const TaskNotifier: React.FC<{}> = props => {
  const api = useApi();

  const loadTaskData = useCallback(
    async (token: CancelToken) => {
      const filter = { filter: { dismissed: false } };
      return (await api('/tasks', { params: filter })).items;
    },
    [api]
  );

  // This contains task search results
  const [tasks, isTaskLoading, reloadTask] = useLoadData<Task[]>(loadTaskData);

  // This contains task progress sent from the SSE endpoint
  const taskProgress = useSelector(state => state.taskProgress);

  useEffect(() => {
    if (
      tasks &&
      !isTaskLoading &&
      Object.entries(taskProgress).some(
        ([taskId, task]) =>
          task.status === 'processing' && !tasks.find(t => t.taskId === taskId)
      )
    ) {
      // A new task has been registered
      reloadTask();
    }
  });

  if (!tasks) return null;

  const inProgress = Object.values(taskProgress).some(
    v => v.status === 'processing'
  );

  const handleDismissClick = async (taskId: string) => {
    await api(`/tasks/${taskId}`, {
      method: 'patch',
      data: { dismissed: true }
    });
    reloadTask();
  };

  return (
    <li className="icon-menu">
      <Link to="/task-list">
        <StyledIconSpan className={classNames({ 'in-progress': inProgress })}>
          <Icon icon="glyphicon-bell" />
        </StyledIconSpan>
      </Link>
      <ul className="pull-left">
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
      </ul>
    </li>
  );
};

const StyledIconSpan = styled.span`
  &.in-progress {
    color: yellow;
  }
  .glyphicon-bell {
    font-size: 25px;
    vertical-align: middle;
  }
`;

const TaskDisplay: React.FC<{
  task: Task;
  progress?: TaskProgress;
  onDismissClick: () => void;
}> = props => {
  const { task, progress, onDismissClick } = props;

  const status = progress?.status ?? task.status;

  const message =
    progress?.message ??
    (task.status === 'finished'
      ? `Finished (${moment(task.endedAt).fromNow()})`
      : task.status === 'processing'
      ? 'In progress'
      : `Error (${moment(task.endedAt).fromNow()})`);

  return (
    <StyledTaskDisplay className={status}>
      <div className="task-main">
        <IconButton
          title="Dismiss"
          onClick={onDismissClick}
          bsSize="sm"
          bsStyle="primary"
          icon="glyphicon-check"
        />
        <div className="task-info">
          <div className="task-name">{task.name}</div>
          <div className="task-message">{message}</div>
        </div>
        {task.downloadFileType && task.status === 'finished' && (
          <a href={`/tasks/${task.taskId}/download`}>
            <IconButton bsSize="sm" bsStyle="link" icon="glyphicon-download" />
          </a>
        )}
      </div>
      <TaskProgressBar
        status={status}
        finished={progress?.finished}
        total={progress?.total}
      />
    </StyledTaskDisplay>
  );
};

const TaskProgressBar: React.FC<{
  status: 'finished' | 'error' | 'processing';
  finished?: number;
  total?: number;
}> = props => {
  const { status, finished, total } = props;

  const percent =
    status === 'processing' &&
    typeof finished === 'number' &&
    typeof total === 'number'
      ? (finished / total) * 100
      : 100;
  return (
    <div className="task-progressbar">
      <div
        className={classNames('bar', status)}
        style={percent !== undefined ? { right: `${100 - percent}%` } : {}}
      />
    </div>
  );
};

const shift = keyframes`
  from { background-position-x: 0; }
  to { background-position-x: 20px; }
`;

const StyledTaskDisplay = styled.div`
  color: black;
  width: 300px;
  border-bottom: 2px;
  line-height: 1;
  &:hover {
    color: white;
    background: ${(props: any) => props.theme.brandPrimary};
  }
  &.error {
    .task-message {
      color: red;
    }
  }
  .task-main {
    display: flex;
    flex-flow: row;
    align-items: center;
  }
  .task-info {
    flex-grow: 1;
  }
  .task-info {
    padding: 5px 5px 0 5px;
  }
  .task-message {
    padding: 2px 7px;
    font-size: 80%;
  }
  .task-progressbar {
    height: 4px;
    width: 100%;
    position: relative;
    background: silver;
    .bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      &.finished {
        background-color: #779977;
      }
      &.error {
        background-color: #dd0000;
      }
      &.processing {
        background: repeating-linear-gradient(90deg, yellow 0px, orange 20px);
        background-size: 20px 4px;
        animation: ${shift} 0.7s linear infinite;
      }
    }
  }
`;

export default TaskNotifier;
