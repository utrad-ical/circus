import React from 'react';
import PluginJobSearchResults from './PluginJobSearchResults';
import PluginJobSearchCondition from './PluginJobSearchCondition';
import Icon from 'components/Icon';

const PluginSearch = props => (
  <div>
    <h1>
      <Icon icon="circus-case" /> CAD Plugin Search
    </h1>
    <PluginJobSearchCondition presetName={props.params.presetName} />
    <PluginJobSearchResults />
  </div>
);

export default PluginSearch;
