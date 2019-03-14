import React, { useState, useEffect } from 'react';
import { Button } from 'components/react-bootstrap';
import LoadingIndicator from 'rb/LoadingIndicator';
import { useApi } from 'utils/api';
import Icon from 'components/Icon';

const TaskList = props => {
  const [tasks] = useState([]);
  const [, setDownloadList] = useState();
  const api = useApi();

  useEffect(
    () => {
      const refresh = async () => {
        const items = (await api('tasks')).items;
        setDownloadList(items);
      };
      refresh();
    },
    [api]
  );

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

const TaskItems = props => {
  const table = (
    <table className="table">
      <thead>
        <tr>
          <th>Task ID</th>
          <th>Status</th>
          <th>Public</th>
          <th>Date</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody>
        {props.items.map(item => (
          <tr key={item.taskId}>
            <td>{item.taskId}</td>
            <td>{item.status}</td>
            <td>{item.publicDownload ? 'Yes' : '-'}</td>
            <td>{item.createdAt}</td>
            <td>
              <a href={'download/' + item.taskID}>
                <Button>Download</Button>
              </a>
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
