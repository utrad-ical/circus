import React from 'react';
import IconDisplay from './IconDisplay';

const PluginDisplay = props => {
  const { plugin, ...rest } = props;
  const title = `${plugin.name} v${plugin.version}`;
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
