import classnames from 'classnames';
import Button from '#components/Button.tsx';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import Icon from '#components/Icon.tsx';
import SearchResultsView, {
  makeSortOptions
} from '#components/SearchResultsView.tsx';
import TimeDisplay from '#components/TimeDisplay.tsx';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useApi } from '#utils/api.ts';
import { newSearch } from '../store/searches.ts';
import type Task from '#types/Task.ts';
import useTaskDismisser from '#utils/useTaskDismisser.ts';
import { capitalize } from '#utils/util.ts';
import useTaskDownloadHandler from '#utils/useTaskDownloadHandler.ts';
import styles from './TaskList.module.css';

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
    renderer: function DownloadLink({ value }) {
      const { status, taskId, downloadFileType } = value;
      const handleClick = useTaskDownloadHandler(taskId);
      return status === 'finished' && downloadFileType ? (
        <Button
          variant="primary"
          size="small"
          icon="material-arrow_circle_down"
          onClick={handleClick}
        />
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
        <Button
          disabled={value.dismissed}
          size="small"
          variant="primary"
          onClick={() => dismissTask(value.taskId)}
          icon="material-select_check_box"
        >
          Done
        </Button>
      );
    }) as React.FC<any>
  }
];

const DataView: React.FC<{ value: Task[] }> = props => {
  const { value } = props;
  return (
    <DataGrid
      className={classnames('task-search-result', styles.grid)}
      columns={columns}
      itemPrimaryKey="taskId"
      value={value}
    />
  );
};

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
      <Button icon="material-add" onClick={handleClick}>
        Run debug task
      </Button>
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
        <Icon icon="material-checklist" /> Tasks
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
      {import.meta.env.DEV && <DebugTaskLauncher />}
    </div>
  );
};

export default TaskList;
