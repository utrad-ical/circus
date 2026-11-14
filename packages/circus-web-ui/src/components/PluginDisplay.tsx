import React, { useEffect } from 'react';
import IconDisplay from './IconDisplay.tsx';
import { loadPluginInfo } from '#store/plugins.ts';
import { useSelector, useDispatch } from 'react-redux';
import { api } from '#utils/api.ts';

const PluginDisplay: React.FC<{
  pluginId: string;
  size?: string;
}> = props => {
  const { pluginId, size } = props;
  const plugin = useSelector(state => state.plugins[pluginId]);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!plugin) dispatch(loadPluginInfo(pluginId));
  }, [dispatch, plugin, pluginId]);

  if (!plugin || plugin === 'loading') return null;

  const title = `${plugin.pluginName} v${plugin.version}`;
  return (
    <IconDisplay
      title={title}
      icon={plugin.icon}
      toolTip={plugin.description}
      size={size}
    />
  );
};

export default PluginDisplay;
