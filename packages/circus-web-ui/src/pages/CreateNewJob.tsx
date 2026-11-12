import Button from '#components/Button.tsx';
import Icon from '#components/Icon.tsx';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { confirm } from '@smikitky/rb-components/lib/modal';
import Select from '#components/Select.tsx';
import CsVolumeDownloadModal from '#components/CsVolumeDownloadModal.tsx';
import PluginDisplay from '#components/PluginDisplay.tsx';
import type { SeriesEntry } from '#components/SeriesSelector.tsx';
import SeriesSelector from '#components/SeriesSelector.tsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '#utils/api.ts';
import useLocalPreference from '#utils/useLocalPreference.ts';
import useLoginUser from '#utils/useLoginUser.ts';
import useShowMessage from '#utils/useShowMessage.ts';

const CreateNewJob: React.FC<{}> = props => {
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [defaultPlugin, setDefaultPlugin] = useLocalPreference(
    'defaultPlugin',
    ''
  );
  const [selectedSeries, setSelectedSeries] = useState<SeriesEntry[]>([]);
  const [busy, setBusy] = useState(true);
  const [showVolumeDownloadModal, setShowVolumeDownloadModal] = useState(false);

  const api = useApi();
  const user = useLoginUser();
  const accessiblePlugins = useMemo(
    () =>
      user.accessiblePlugins.filter(
        p => p.roles.includes('executePlugin') && p.roles.includes('readPlugin')
      ),
    [user]
  );

  const showMessage = useShowMessage();
  const seriesUid = useParams<any>().seriesUid;

  useEffect(() => {
    if (!seriesUid) return;
    const load = async () => {
      setBusy(true);
      setSelectedSeries([{ seriesUid, partialVolumeDescriptor: 'auto' }]);
      setBusy(false);
    };
    load();
  }, [api, seriesUid]);

  // Pre-select previously-used plug-in
  useEffect(() => {
    if (
      accessiblePlugins &&
      !selectedPlugin &&
      defaultPlugin &&
      accessiblePlugins.find(p => p.pluginId === defaultPlugin)
    ) {
      setSelectedPlugin(defaultPlugin);
    }
  }, [defaultPlugin, accessiblePlugins, selectedPlugin]);

  const handleCreate = async () => {
    const callApi = async (force = false) => {
      return await api('plugin-jobs', {
        method: 'post',
        data: {
          pluginId: selectedPlugin,
          series: selectedSeries,
          ...(force ? { force: true } : {})
        },
        handleErrors: [400]
      });
    };

    if (!selectedPlugin) return;
    try {
      try {
        await callApi(false);
      } catch (err: any) {
        if (/duplicate job/i.test(err?.response?.data?.error)) {
          const res = await confirm(
            'There is a duplicate job similar to this one. ' +
              'Do you want to register this job anyway?'
          );
          if (res) await callApi(true);
          else return;
        } else throw err;
      }
    } catch (err) {
      showMessage('The CIRCUS Server returned 400 Bad Request.', 'danger');
      return;
    }
    setDefaultPlugin(selectedPlugin);
    showMessage('Job registered.');
  };

  const handleVolumeDownload = async () => {
    setShowVolumeDownloadModal(true);
  };

  if (!Array.isArray(accessiblePlugins)) {
    return <LoadingIndicator />;
  }

  if (!accessiblePlugins.length) {
    return (
      <div className="alert alert-danger">There is no plug-in installed.</div>
    );
  }

  const canCreate = !busy && selectedPlugin && selectedSeries.length > 0;

  const pluginOptions: { [pluginId: string]: any } = {};
  accessiblePlugins.forEach(plugin => {
    pluginOptions[plugin.pluginId] = {
      caption: <PluginDisplay pluginId={plugin.pluginId} />
    };
  });

  return (
    <div>
      <h1>
        <Icon icon="circus-b-calc" />
        New Job
      </h1>
      <SeriesSelector value={selectedSeries} onChange={setSelectedSeries} />
      <div>
        Plug-in:&ensp;
        <Select
          options={pluginOptions}
          value={selectedPlugin!}
          onChange={setSelectedPlugin}
        />
      </div>
      <div className="text-right">
        {user.globalPrivileges.includes('downloadVolume') && (
          <>
            <Button
              disabled={!canCreate}
              icon="material-arrow_circle_down"
              onClick={handleVolumeDownload}
            >
              Download volume
            </Button>
            &ensp;
          </>
        )}
        <Button
          disabled={!canCreate}
          icon="circus-b-calc"
          variant="primary"
          onClick={handleCreate}
        >
          Register Job
        </Button>
      </div>
      {showVolumeDownloadModal && (
        <CsVolumeDownloadModal
          series={selectedSeries}
          onClose={() => setShowVolumeDownloadModal(false)}
        />
      )}
    </div>
  );
};

export default CreateNewJob;
