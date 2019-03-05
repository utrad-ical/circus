import React, { useEffect } from 'react';
import Icon from 'components/Icon';
import { startNewSearch } from 'actions';
import PluginJobQueueSearchResults from './PluginJobQueueSearchResults';
import { connect } from 'react-redux';
import { useApi } from 'utils/api';

const PluginJobQueueSearch = props => {
  const api = useApi();

  useEffect(() => {
    const { dispatch } = props;
    dispatch(
      startNewSearch(
        api,
        'pluingJobQueue',
        'plugin-job-queue',
        {},
        {},
        { jobId: -1 }
      )
    );
  }, []);

  return (
    <div>
      <h1>
        <Icon icon="circus-case" /> Plug-in Job Queue
      </h1>
      <PluginJobQueueSearchResults />
    </div>
  );
};

export default connect()(PluginJobQueueSearch);
