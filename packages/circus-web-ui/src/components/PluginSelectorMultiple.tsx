import React from 'react';
import MultiSelect from '#components/MultiSelect.tsx';
import BodyPartIcon from './BodyPartIcon.tsx';
import type Plugin from '#types/Plugin.ts';
import styles from './PluginSelectorMultiple.module.css';

const Renderer: React.FC<{
  renderAs: 'select' | 'list';
  plugin: Plugin;
}> = props => {
  const { renderAs = 'dropdown', plugin } = props;
  return (
    <span>
      <BodyPartIcon icon={plugin.icon} />
      &ensp;
      <b>
        {plugin.pluginName} v{plugin.version}
      </b>
      {renderAs === 'select' && <small>&ensp;{plugin.description}</small>}
    </span>
  );
};

const PluginSelectorMultiple: React.FC<{
  plugins: { pluginId: string; plugin: Plugin }[];
  noneText?: string;
  value: string[];
  onChange: (value: string[]) => void;
}> = props => {
  const { plugins, ...rest } = props;
  const options: { [key: string]: any } = {};
  plugins.forEach(p => {
    options[p.pluginId] = {
      caption: p.plugin.pluginName,
      plugin: p.plugin
    };
  });
  return (
    <MultiSelect
      {...rest}
      className={styles.pluginSelectorMultiple}
      options={options}
      renderer={Renderer}
    />
  );
};

export default PluginSelectorMultiple;
