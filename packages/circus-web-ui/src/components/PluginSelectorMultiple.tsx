import React from 'react';
import MultiSelect from '@smikitky/rb-components/lib/MultiSelect';
import BodyPartIcon from './BodyPartIcon';
import styled from 'styled-components';
import Plugin from 'types/Plugin';

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

const StyledMultiSelect = styled(MultiSelect)`
  ul {
    white-space: nowrap;
    max-width: 400px;
    overflow: scroll;
  }
`;

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
  return <StyledMultiSelect {...rest} options={options} renderer={Renderer} />;
};

export default PluginSelectorMultiple;
