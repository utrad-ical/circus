import React from 'react';
import IconDisplay from './IconDisplay';
import { connect } from 'react-redux';
import { loadPluginInfo } from 'actions';

const PluginDisplayView = props => {
  const { plugin, pluginId, ...rest } = props;
  if (!plugin) {
    props.dispatch(loadPluginInfo(pluginId));
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

const PluginDisplay = connect((state, ownProps) => ({
  plugin: state.plugin[ownProps.pluginId]
}))(PluginDisplayView);

export default PluginDisplay;
