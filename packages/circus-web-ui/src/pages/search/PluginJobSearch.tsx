import React from 'react';
import PluginJobSearchResults from './PluginJobSearchResults';
import PluginJobSearchCondition from './PluginJobSearchCondition';
import Icon from 'components/Icon';
import { useParams } from 'react-router-dom';

const PluginSearch: React.FC<{}> = props => {
  const presetName = useParams<any>().presetName;
  return (
    <div>
      <h1>
        <Icon icon="circus-job" /> Plug-in Job Search
      </h1>
      <PluginJobSearchCondition presetName={presetName} />
      <PluginJobSearchResults />
    </div>
  );
};

export default PluginSearch;
