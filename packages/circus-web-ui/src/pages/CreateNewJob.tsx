import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { showMessage } from 'actions';
import IconButton from 'components/IconButton';
import PluginDisplay from 'components/PluginDisplay';
import SeriesSelector, { SeriesEntry } from 'components/SeriesSelector';
import React, { useEffect, useState } from 'react';
import { useApi } from 'utils/api';
import useLocalPreference from 'utils/useLocalPreference';
import { useParams } from 'react-router-dom';
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
  const seriesUid = useParams<any>().seriesUid;

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      const series = await api('series/' + seriesUid);
      const plugins = (await api('plugins')) as Plugin[];
      setPlugins(plugins);
      setSelectedSeries([
        { seriesUid, partialVolumeDescriptor: undefined, data: series }
      ]);
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
    const series = selectedSeries.map(s => ({
      seriesUid: s.seriesUid,
      partialVolumeDesciptor: s.partialVolumeDescriptor
    }));
    await api('plugin-jobs', {
      method: 'post',
      data: { pluginId: selectedPlugin, series }
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
          value={selectedPlugin}
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
