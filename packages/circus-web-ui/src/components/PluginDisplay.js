import React from 'react';
import IconDisplay from './IconDisplay';
import { loadPluginInfo } from 'actions';
import { useMappedState, useDispatch } from 'redux-react-hook';
import { useApi } from 'utils/api';

const PluginDisplay = props => {
  const { pluginId, ...rest } = props;
  const { plugin } = useMappedState(state => ({
    plugin: state.plugin[pluginId]
  }));
  const dispatch = useDispatch();
  const api = useApi();

  if (!plugin) {
    dispatch(loadPluginInfo(api, pluginId));
  }

  if (!plugin || plugin === 'loading') return null;

  const title = `${plugin.pluginName} v${plugin.version}`;
  return (
    <IconDisplay
      title={title}
      icon={plugin.icon}
      toolTip={plugin.description}
      {...rest}
    />
  );
};

export default PluginDisplay;
