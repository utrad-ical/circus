import React, { useState, useEffect } from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import IconButton from 'components/IconButton';
import { useApi } from 'utils/api';
import SeriesSelector from 'components/SeriesSelector';
import LoadingIndicator from 'rb/LoadingIndicator';
import PluginDisplay from 'components/PluginDisplay';
import { showMessage } from 'actions';
import useLocalPreference from 'utils/useLocalPreference';

const CreateNewJob = props => {
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [defaultPlugin, setDefaultPlugin] = useLocalPreference('defaultPlugin');
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [busy, setBusy] = useState(true);
  const [plugins, setPlugins] = useState(null);
  const api = useApi();
  const seriesUid = props.match.params.seriesUid;

  useEffect(
    () => {
      const load = async () => {
        setBusy(true);
        const series = await api('series/' + seriesUid);
        const plugins = await api('plugins');
        setBusy(false);
        setSelectedSeries([{ ...series, range: series.images }]);
        setPlugins(plugins);
      };
      load();
    },
    [api, seriesUid]
  );

  // Pre-select previously-used plug-in
  useEffect(
    () => {
      if (
        plugins &&
        !selectedPlugin &&
        plugins.find(p => p.pluginId === defaultPlugin)
      ) {
        setSelectedPlugin(defaultPlugin);
      }
    },
    [defaultPlugin, plugins, selectedPlugin]
  );

  const handleCreate = async () => {
    await api('plugin-jobs', {
      method: 'post',
      data: { pluginId: selectedPlugin, series: selectedSeries }
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

  const pluginOptions = {};
  Object.keys(plugins).forEach(k => {
    const plugin = plugins[k];
    pluginOptions[plugin.pluginId] = {
      caption: <PluginDisplay pluginId={plugin.pluginId} />
    };
  });

  return (
    <div>
      <h1>
        <span className="circus-icon-b-calc" />New Job
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
