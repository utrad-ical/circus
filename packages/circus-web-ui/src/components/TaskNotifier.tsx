import { OverlayTrigger, Popover } from 'components/react-bootstrap';
import React from 'react';
import { useSelector } from 'react-redux';
import Icon from './Icon';

const TaskNotifier: React.FC<{}> = props => {
  const taskProgress = useSelector(state => state.taskProgress);

  if (!Object.values(taskProgress).some(v => v.status === 'processing')) {
    return null;
  }

  const overlay = (
    <Popover id="task-progress">
      <ul>
        {Object.entries(taskProgress).map(([taskId, task]) => {
          return <li>{taskId}</li>;
        })}
      </ul>
    </Popover>
  );

  return (
    <OverlayTrigger
      trigger="click"
      rootClose
      overlay={overlay}
      placement="bottom"
    >
      <Icon icon="glyphicon-bell" />
    </OverlayTrigger>
  );
};

export default TaskNotifier;
