import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import Icon from 'components/Icon';
import { Button } from 'components/react-bootstrap';
import TimeDisplay from 'components/TimeDisplay';
import React, { useEffect, useState } from 'react';
import { useApi } from 'utils/api';

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

const TaskList: React.FC = props => {
  const [tasks, setTasks] = useState([]);
  const api = useApi();

  useEffect(() => {
    const refresh = async () => {
      const items = (await api('tasks')).items;
      setTasks(items);
    };
    refresh();
  }, [api]);

  if (!Array.isArray(tasks)) {
    return <LoadingIndicator />;
  }
  return (
    <div>
      <h1>
        <Icon icon="tasks" /> Tasks
      </h1>
      <TaskItems items={tasks} />
    </div>
  );
};

export default TaskList;

const TaskItems: React.FC<{ items: Task[] }> = props => {
  const table = (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Message</th>
          <th>Started at</th>
          <th>Ended at</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody>
        {props.items.map(item => (
          <tr key={item.taskId}>
            <td>{item.name}</td>
            <td>{item.status}</td>
            <td>{item.finishedMessage ?? item.errorMessage}</td>
            <td>
              <TimeDisplay value={item.createdAt} />
            </td>
            <td>{item.endedAt ? <TimeDisplay value={item.endedAt} /> : '-'}</td>
            <td>
              {item.downloadFileType ? (
                <a href={`tasks/${item.taskId}/download`}>
                  <Button>Download</Button>
                </a>
              ) : (
                '-'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const count = props.items.length;
  const countStr = count === 1 ? `${count} result.` : `${count} results.`;

  return (
    <div>
      <p>{countStr}</p>
      {table}
    </div>
  );
};
