import React from 'react';
import { Button, Panel, ProgressBar } from 'shared/components/react-bootstrap';
import { api } from 'utils/api';

export const TaskProgress = ({
  header = 'Progress',
  progress = 0,
  bsStyle = 'info',
  cancelable = false,
  indeterminate = false,
  finished = false,
  onCancelClick = () => {},
  onOkClick = () => {},
  ...props
}) => {
  let footer = null;
  if (cancelable && !finished) {
    footer = (
      <div className="text-center">
        <Button onClick={onCancelClick}>Cancel</Button>
      </div>
    );
  }
  if (finished) {
    footer = (
      <div className="text-center">
        <Button onClick={onOkClick}>OK</Button>
      </div>
    );
  }
  return (
    <Panel
      className="taskwatcher"
      bsStyle={bsStyle}
      header={header}
      footer={footer}
    >
      <p>{props.message}</p>
      {indeterminate ? (
        <ProgressBar now={100} active />
      ) : (
        <ProgressBar label={`${progress}%`} now={progress} />
      )}
    </Panel>
  );
};

/**
 * Calls remote 'task' API and renders its status.
 */
export class TaskWatcher extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      progress: 0,
      indeterminate: false,
      finished: false
    };
  }

  async query() {
    const data = await api(`task/${this.props.taskID}`);
    const indeterminate = data.max <= 0;
    const progress = data.value / data.max * 100;
    this.setState({ indeterminate, progress });
    if (!data.finished) {
      setTimeout(() => this.query(), 1000);
    }
  }

  componentDidMount() {
    this.query();
  }

  render() {
    return (
      <TaskProgress
        indeterminate={this.state.indeterminate}
        progress={this.state.progress}
        finished={this.state.finished}
        message={this.props.message}
      />
    );
  }
}
