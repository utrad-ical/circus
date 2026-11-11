import React from 'react';
import PluginJobSearchResults from './PluginJobSearchResults.tsx';
import PluginJobSearchCondition from './PluginJobSearchCondition.tsx';
import Icon from '#components/Icon.tsx';

const PluginSearch: React.FC<{}> = props => {
  return (
    <div>
      <h1>
        <Icon icon="circus-job" /> Plug-in Job Search
      </h1>
      <PluginJobSearchCondition />
      <PluginJobSearchResults searchName="pluginJob" />
    </div>
  );
};

export default PluginSearch;
