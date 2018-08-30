import React from 'react';
import { api } from 'utils/api';
import AdminContainer from './AdminContainer';
import IconButton from 'components/IconButton';
import { Panel } from 'components/react-bootstrap';
import LoadingIndicator from 'rb/LoadingIndicator';

export default class PluginJobManagerAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = { busy: true };
  }

  componentDidMount() {
    this.refresh();
  }

  refresh = async () => {
    this.setState({ busy: true });
    const result = await api('plugin-job-manager');
    this.setState({ busy: false, status: result.status });
  };

  postSwitch = async mode => {
    this.setState({ busy: true });
    try {
      await api('plugin-job-manager/switch', {
        method: 'post',
        data: { status: mode }
      });
      await this.refresh();
    } catch (e) {
      this.setState({ busy: false });
    }
  };

  handleStartClick = async () => {
    await this.postSwitch('running');
  };

  handleStopClick = async () => {
    await this.postSwitch('stopped');
  };

  render() {
    if (this.state.settings === null) return <div />;

    return (
      <AdminContainer title="Plugin Job Manager" icon="th-large">
        <Panel>
          <Panel.Heading>Status</Panel.Heading>
          <Panel.Body>
            {this.state.busy ? <LoadingIndicator /> : this.state.status}
          </Panel.Body>
          <Panel.Footer>
            <IconButton
              icon="play"
              bsSize="large"
              bsStyle="primary"
              onClick={this.handleStartClick}
            >
              Start
            </IconButton>
            &ensp;
            <IconButton
              icon="stop"
              bsSize="large"
              bsStyle="danger"
              onClick={this.handleStopClick}
            >
              Stop
            </IconButton>
            &ensp;
            <IconButton
              icon="refresh"
              bsSize="large"
              bsStyle="link"
              onClick={this.refresh}
            >
              Refresh Status
            </IconButton>
          </Panel.Footer>
        </Panel>
      </AdminContainer>
    );
  }
}
