import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import TimeDisplay from 'components/TimeDisplay';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import { newSearch } from '../store/searches';
import Task from 'types/Task';
import useTaskDismisser from 'utils/useTaskDismisser';
import { capitalize } from 'utils/util';

const sortOptions = makeSortOptions({
  createdAt: 'task create time',
  name: 'name'
});

const useTaskProgress = (taskId: string) => {
  return useSelector(state => state.taskProgress[taskId]);
};

const StatusRenderer: React.FC<{ value: Task }> = ({ value }) => {
  // Takes the real-time task progress into consideration
  const progress = useTaskProgress(value.taskId);
  const status = progress?.status ?? value.status;
  return <span className={status}>{capitalize(status)}</span>;
};

const MessageRenderer: React.FC<{ value: Task }> = ({ value }) => {
  // Takes the real-time task progress into consideration
  const progress = useTaskProgress(value.taskId);
  const status = progress?.status ?? value.status;
  const message =
    progress?.message ?? value.errorMessage ?? value.finishedMessage;
  const number =
    typeof progress?.finished === 'number' &&
    typeof progress?.total === 'number'
      ? `(${progress.finished}/${progress.total})`
      : '';
  return (
    <span className={status}>
      {number && <>{number} </>}
      {message}
    </span>
  );
};

const columns: DataGridColumnDefinition<Task>[] = [
  { caption: 'Name', key: 'name' },
  { caption: 'Status', key: 'status', renderer: StatusRenderer },
  { caption: 'Message', key: 'message', renderer: MessageRenderer },
  {
    caption: 'Start / End',
    key: 'createdAt',
    renderer: ({ value }) => {
      return (
        <>
          <TimeDisplay value={value.createdAt} />
          <br />
          {value.endedAt ? <TimeDisplay value={value.endedAt} /> : <>&ensp;</>}
        </>
      );
    }
  },
  {
    caption: 'Download',
    key: 'download',
    renderer: ({ value }) => {
      return value.status === 'finished' && value.downloadFileType ? (
        <IconButton bsStyle="success" bsSize="sm" icon="glyphicon-download" />
      ) : (
        <>-</>
      );
    }
  },
  {
    caption: 'Dismiss',
    key: 'dismiss',
    renderer: (({ value }) => {
      const dismissTask = useTaskDismisser();
      return (
        <IconButton
          disabled={value.dismissed}
          bsSize="sm"
          bsStyle="primary"
          onClick={() => dismissTask(value.taskId)}
          icon="glyphicon-check"
        >
          Done
        </IconButton>
      );
    }) as React.FC<any>
  }
];

const DataView: React.FC<{ value: Task[] }> = props => {
  const { value } = props;
  return (
    <StyledDataGrid
      className="task-search-result"
      columns={columns}
      itemPrimaryKey="taskId"
      value={value}
    />
  );
};

const StyledDataGrid = styled(DataGrid)`
  .status {
    .error {
      color: red;
      font-weight: bold;
    }
    .processing {
      color: blue;
      font-weight: bold;
    }
    .finished {
      color: green;
    }
  }
  .message {
    .error {
      color: red;
    }
    .processing {
      color: blue;
    }
  }
  .download {
    text-align: center;
  }
  .dismiss {
    text-align: right;
  }
`;

const DebugTaskLauncher: React.FC = props => {
  const api = useApi();

  const handleClick = () => {
    api('/tasks/debug-task', {
      method: 'post',
      data: { fails: false, dl: true }
    });
  };

  return (
    <div>
      <IconButton icon="glyphicon-plus" onClick={handleClick}>
        Run debug task
      </IconButton>
    </div>
  );
};

const TaskList: React.FC<{}> = props => {
  const [showDismissed, setShowDismissed] = useState(false);
  const dispatch = useDispatch();
  const api = useApi();

  useEffect(() => {
    dispatch(
      newSearch(api, 'task', {
        resource: { endPoint: 'tasks', primaryKey: 'taskId' },
        filter: showDismissed ? {} : { dismissed: false },
        condition: { showDismissed },
        sort: '{"createdAt":-1}'
      })
    );
  }, [api, dispatch, showDismissed]);

  return (
    <div>
      <h1>
        <Icon icon="tasks" /> Tasks
      </h1>
      <label>
        <input
          type="checkbox"
          checked={showDismissed}
          onChange={ev => setShowDismissed(ev.target.checked)}
        />{' '}
        Show dismissed items
      </label>
      <SearchResultsView
        sortOptions={sortOptions}
        dataView={DataView}
        refreshable
        name="task"
      />
      {process.env.NODE_ENV === 'development' && <DebugTaskLauncher />}
    </div>
  );
};

export default TaskList;
