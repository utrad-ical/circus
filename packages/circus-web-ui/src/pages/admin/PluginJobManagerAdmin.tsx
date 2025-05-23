import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from 'utils/api';
import AdminContainer from './AdminContainer';
import IconButton from 'components/IconButton';
import { Panel } from 'components/react-bootstrap';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';

const PluginJobManagerAdmin: React.FC<{}> = props => {
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const api = useApi();

  const refresh = useCallback(
    async (isMounted: boolean) => {
      setBusy(true);
      const result = await api('admin/plugin-job-manager');
      if (!isMounted) return;
      setBusy(false);
      setStatus(result.status);
    },
    [api]
  );

  useEffect(() => {
    let isMounted = true;
    refresh(isMounted);
    return () => {
      isMounted = false;
    };
  }, [refresh]);

  const postSwitch = async (mode: string) => {
    setBusy(true);
    try {
      await api('admin/plugin-job-manager/switch', {
        method: 'put',
        data: { status: mode }
      });
      await refresh(true);
    } catch (e) {
      setBusy(false);
    }
  };

  const handleStartClick = () => postSwitch('running');

  const handleStopClick = () => postSwitch('stopped');

  return (
    <AdminContainer title="Plugin Job Manager" icon="material-grid_view">
      <Panel bsStyle="primary">
        <Panel.Heading>Status</Panel.Heading>
        <Panel.Body>{busy ? <LoadingIndicator /> : status}</Panel.Body>
        <Panel.Footer>
          <IconButton
            icon="material-play_arrow"
            bsSize="large"
            bsStyle="primary"
            onClick={handleStartClick}
          >
            Start
          </IconButton>
          &ensp;
          <IconButton
            icon="material-stop"
            bsSize="large"
            bsStyle="danger"
            onClick={handleStopClick}
          >
            Stop
          </IconButton>
          &ensp;
          <IconButton
            icon="material-autorenew"
            bsSize="large"
            bsStyle="link"
            onClick={() => refresh(true)}
          >
            Refresh Status
          </IconButton>
        </Panel.Footer>
      </Panel>
    </AdminContainer>
  );
};

export default PluginJobManagerAdmin;
