import React from 'react';
import PluginJobSearchResults from './PluginJobSearchResults';
import PluginJobSearchCondition from './PluginJobSearchCondition';
import Icon from 'components/Icon';

const PluginSearch: React.FC<{}> = props => {
  return (
    <div>
      <h1>
        <Icon icon="circus-job" /> Plug-in Job Search
      </h1>
      <PluginJobSearchCondition />
      <PluginJobSearchResults />
    </div>
  );
};

export default PluginSearch;
