import React, { useEffect } from 'react';
import Icon from 'components/Icon';
import { startNewSearch } from 'actions';
import PluginJobQueueSearchResults from './PluginJobQueueSearchResults';
import { useApi } from 'utils/api';
import { useDispatch } from 'redux-react-hook';

const PluginJobQueueSearch = props => {
  const api = useApi();
  const dispatch = useDispatch();

  useEffect(() => {
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
  }, [api, dispatch]);

  return (
    <div>
      <h1>
        <Icon icon="circus-case" /> Plug-in Job Queue
      </h1>
      <PluginJobQueueSearchResults />
    </div>
  );
};

export default PluginJobQueueSearch;
