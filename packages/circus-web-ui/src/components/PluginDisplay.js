import React, { useEffect } from 'react';
import IconDisplay from './IconDisplay';
import { loadPluginInfo } from 'actions';
import { useSelector, useDispatch } from 'react-redux';
import { useApi } from 'utils/api';

const PluginDisplay = props => {
  const { pluginId, ...rest } = props;
  const plugin = useSelector(state => state.plugin[pluginId]);
  const dispatch = useDispatch();
  const api = useApi();

  useEffect(() => {
    if (!plugin) dispatch(loadPluginInfo(api, pluginId));
  }, [api, dispatch, plugin, pluginId]);

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
