import React, { useState, useEffect } from 'react';
import { useApi } from 'utils/api';
import AdminContainer from './AdminContainer';
import IconButton from 'components/IconButton';
import { Panel } from 'components/react-bootstrap';
import LoadingIndicator from 'rb/LoadingIndicator';

const PluginJobManagerAdmin = props => {
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState(null);
  const api = useApi();

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setBusy(true);
    const result = await api('admin/plugin-job-manager');
    setBusy(false);
    setStatus(result.status);
  };

  const postSwitch = async mode => {
    setBusy(true);
    try {
      await api('admin/plugin-job-manager/switch', {
        method: 'post',
        data: { status: mode }
      });
      await this.refresh();
    } catch (e) {
      setBusy(false);
    }
  };

  const handleStartClick = () => postSwitch('running');

  const handleStopClick = () => postSwitch('stopped');

  return (
    <AdminContainer title="Plugin Job Manager" icon="th-large">
      <Panel>
        <Panel.Heading>Status</Panel.Heading>
        <Panel.Body>{busy ? <LoadingIndicator /> : status}</Panel.Body>
        <Panel.Footer>
          <IconButton
            icon="play"
            bsSize="large"
            bsStyle="primary"
            onClick={handleStartClick}
          >
            Start
          </IconButton>
          &ensp;
          <IconButton
            icon="stop"
            bsSize="large"
            bsStyle="danger"
            onClick={handleStopClick}
          >
            Stop
          </IconButton>
          &ensp;
          <IconButton
            icon="refresh"
            bsSize="large"
            bsStyle="link"
            onClick={refresh}
          >
            Refresh Status
          </IconButton>
        </Panel.Footer>
      </Panel>
    </AdminContainer>
  );
};

export default PluginJobManagerAdmin;
