import classNames from 'classnames';
import IconButton from 'components/IconButton';
import moment from 'moment';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { newSearch, updateSearch } from 'store/searches';
import styled, { keyframes } from 'styled-components';
import Task from 'types/Task';
import { useApi } from 'utils/api';
import useTaskDismisser from 'utils/useTaskDismisser';
import { TaskProgress } from '../store/taskProgress';
import Icon from './Icon';

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
    <StyledLi className="icon-menu">
      <Link to="/task-list">
        <span className={classNames({ 'in-progress': inProgress })}>
          <Icon icon="glyphicon-bell" />
        </span>
      </Link>
      <ul className="dropdown pull-left">
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
    </StyledLi>
  );
};

const StyledLi = styled.li`
  .dropdown {
    max-height: 500px;
    overflow-y: auto;
  }
  .in-progress {
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
        <div className="task-info">
          <div className="task-name">{task.name}</div>
          <div className="task-message">{message}</div>
        </div>
        {task.downloadFileType && task.status === 'finished' && (
          <IconButton bsSize="sm" bsStyle="success" icon="glyphicon-download" />
        )}
        <IconButton
          title="Dismiss"
          onClick={onDismissClick}
          bsSize="sm"
          bsStyle="primary"
          icon="glyphicon-check"
        />
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
