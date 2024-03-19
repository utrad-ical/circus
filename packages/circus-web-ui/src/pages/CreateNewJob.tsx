import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { confirm } from '@smikitky/rb-components/lib/modal';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import CsVolumeDownloadModal from 'components/CsVolumeDownloadModal';
import IconButton from 'components/IconButton';
import PluginDisplay from 'components/PluginDisplay';
import SeriesSelector, { SeriesEntry } from 'components/SeriesSelector';
import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useApi } from 'utils/api';
import useLocalPreference from 'utils/useLocalPreference';
import useLoginUser from 'utils/useLoginUser';
import useShowMessage from 'utils/useShowMessage';

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
        <span className="circus-icon-b-calc" />
        New Job
      </h1>
      <SeriesSelector value={selectedSeries} onChange={setSelectedSeries} />
      <div>
        Plugin:&ensp;
        <ShrinkSelect
          options={pluginOptions}
          value={selectedPlugin!}
          onChange={setSelectedPlugin}
        />
      </div>
      <div className="text-right">
        {user.globalPrivileges.includes('downloadVolume') && (
          <>
            <IconButton
              disabled={!canCreate}
              icon="download"
              bsStyle="default"
              onClick={handleVolumeDownload}
            >
              Download volume
            </IconButton>
            &ensp;
          </>
        )}
        <IconButton
          disabled={!canCreate}
          icon="circus-b-calc"
          bsStyle="primary"
          onClick={handleCreate}
        >
          Register Job
        </IconButton>
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
