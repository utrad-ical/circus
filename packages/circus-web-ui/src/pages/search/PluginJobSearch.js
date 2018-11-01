import React from 'react';
import PluginJobSearchResults from './PluginJobSearchResults';
import PluginJobSearchCondition from './PluginJobSearchCondition';
import Icon from 'components/Icon';

const PluginSearch = props => (
  <div>
    <h1>
      <Icon icon="circus-job" /> Plug-in Job Search
    </h1>
    <PluginJobSearchCondition presetName={props.match.params.presetName} />
    <PluginJobSearchResults />
  </div>
);

export default PluginSearch;
