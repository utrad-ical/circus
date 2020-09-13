import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
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
  const [plugins, setPlugins] = useState<Plugin[]>([]);
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
    if (!selectedPlugin) return;
    await api('plugin-jobs', {
      method: 'post',
      data: {
        pluginId: selectedPlugin,
        series: await fillPartialVolumeDescriptors(
          selectedSeries,
          api,
          appState
        )
      }
    });
    setDefaultPlugin(selectedPlugin);
    showMessage('Job registered.');
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
