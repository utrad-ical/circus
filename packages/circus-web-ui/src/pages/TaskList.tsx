import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import TimeDisplay from 'components/TimeDisplay';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import { newSearch } from '../store/searches';

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

const sortOptions = makeSortOptions({
  createdAt: 'task create time',
  name: 'name'
});

const useDismiss = (taskId: string) => {
  const api = useApi();
  const [dismissed, setDismissed] = useState(false);
  const dismiss = async () => {
    await api(`/tasks/${taskId}`, {
      method: 'patch',
      data: { dismissed: true }
    });
    setDismissed(true);
  };
  return [dismiss, dismissed];
};

const columns: DataGridColumnDefinition<Task>[] = [
  { caption: 'Name', key: 'name' },
  {
    caption: 'Status',
    key: 'status',
    renderer: ({ value }) => (
      <span className={value.status}>{value.status}</span>
    )
  },
  {
    caption: 'Message',
    key: 'message',
    renderer: ({ value }) => {
      return value.errorMessage ? (
        <span className="text-danger">{value.errorMessage}</span>
      ) : (
        <span>{value.finishedMessage}</span>
      );
    }
  },
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
        <a href={``}>
          <Icon icon="glyphicon-download" />
        </a>
      ) : (
        <>-</>
      );
    }
  },
  {
    caption: 'Dismiss',
    key: 'dismiss',
    renderer: (({ value }) => {
      const [dismiss, dismissed] = useDismiss(value.taskId);
      return value.dismissed ? null : (
        <IconButton
          disabled={dismissed}
          bsStyle="primary"
          onClick={dismiss}
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
  .finished {
    color: green;
  }
  .error {
    color: red;
    font-size: bold;
  }
  .dismiss {
    text-align: right;
  }
`;

const TaskList: React.FC = props => {
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
    </div>
  );
};

export default TaskList;
