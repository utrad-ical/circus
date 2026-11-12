import Button from '#components/Button.tsx';
import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '#utils/api.ts';
import AdminContainer from './AdminContainer.tsx';
import { Panel } from '#components/react-bootstrap.ts';
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
          <Button
            icon="material-play_arrow"
            size="large"
            variant="primary"
            onClick={handleStartClick}
          >
            Start
          </Button>
          &ensp;
          <Button
            icon="material-stop"
            size="large"
            variant="danger"
            onClick={handleStopClick}
          >
            Stop
          </Button>
          &ensp;
          <Button
            icon="material-autorenew"
            size="large"
            variant="link"
            onClick={() => refresh(true)}
          >
            Refresh Status
          </Button>
        </Panel.Footer>
      </Panel>
    </AdminContainer>
  );
};

export default PluginJobManagerAdmin;
