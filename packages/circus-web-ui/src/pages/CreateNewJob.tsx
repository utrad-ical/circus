import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { confirm } from '@smikitky/rb-components/lib/modal';
import IconButton from 'components/IconButton';
import PluginDisplay from 'components/PluginDisplay';
import SeriesSelector, { SeriesEntry } from 'components/SeriesSelector';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useApi } from 'utils/api';
import fillPartialVolumeDescriptors from 'utils/partialVolumeDescriptor';
import useLocalPreference from 'utils/useLocalPreference';
import useShowMessage from 'utils/useShowMessage';
import Plugin from '../types/Plugin';

const CreateNewJob: React.FC<{}> = props => {
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [defaultPlugin, setDefaultPlugin] = useLocalPreference(
    'defaultPlugin',
    ''
  );
  const [selectedSeries, setSelectedSeries] = useState<SeriesEntry[]>([]);
  const [busy, setBusy] = useState(true);
  const [plugins, setPlugins] = useState<Plugin[] | null>(null);
  const api = useApi();
  const appState = useSelector(state => state);
  const showMessage = useShowMessage();
  const seriesUid = useParams<any>().seriesUid;

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      const plugins = (await api('plugins')) as Plugin[];
      setPlugins(plugins);
      setSelectedSeries([{ seriesUid, partialVolumeDescriptor: undefined }]);
      setBusy(false);
    };
    load();
  }, [api, seriesUid]);

  // Pre-select previously-used plug-in
  useEffect(() => {
    if (
      plugins &&
      !selectedPlugin &&
      defaultPlugin &&
      plugins.find(p => p.pluginId === defaultPlugin)
    ) {
      setSelectedPlugin(defaultPlugin);
    }
  }, [defaultPlugin, plugins, selectedPlugin]);

  const handleCreate = async () => {
    const callApi = async (force = false) => {
      return await api('plugin-jobs', {
        method: 'post',
        data: {
          pluginId: selectedPlugin,
          series: await fillPartialVolumeDescriptors(
            selectedSeries,
            api,
            appState
          ),
          ...(force ? { force: true } : {})
        },
        handleErrors: [400]
      });
    };

    if (!selectedPlugin) return;
    try {
      try {
        await callApi(false);
      } catch (err) {
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
    await api('/series/export-cs-volume', {
      method: 'post',
      data: {
        series: await fillPartialVolumeDescriptors(
          selectedSeries,
          api,
          appState
        )
      }
    });
  };

  if (!Array.isArray(plugins)) {
    return <LoadingIndicator />;
  }

  if (!plugins.length) {
    return (
      <div className="alert alert-danger">There is no plug-in installed.</div>
    );
  }

  const canCreate = !busy && selectedPlugin && selectedSeries.length > 0;

  const pluginOptions: { [pluginId: string]: any } = {};
  plugins.forEach(plugin => {
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
        <IconButton
          disabled={!canCreate}
          icon="download"
          bsStyle="default"
          onClick={handleVolumeDownload}
        >
          Download volume
        </IconButton>
        <IconButton
          disabled={!canCreate}
          icon="circus-b-calc"
          bsStyle="primary"
          onClick={handleCreate}
        >
          Register Job
        </IconButton>
      </div>
    </div>
  );
};

export default CreateNewJob;
