import React, { useEffect } from 'react';
import Icon from 'components/Icon';
import { newSearch } from 'store/searches';
import { useApi } from 'utils/api';
import { useDispatch } from 'react-redux';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';

const sortOptions = makeSortOptions({
  jobId: 'job id'
});

const DataView: React.FC<{ value: any[] }> = props => {
  const { value } = props;
  if (!value.length) {
    return <div>No plug-in job in execution queue.</div>;
  }
  return (
    <ul>
      {value.map(item => (
        <li key={item.jobId}>{item}</li>
      ))}
    </ul>
  );
};

const PluginJobQueueSearchResults: React.FC<{}> = props => {
  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable
      name="pluingJobQueue"
    />
  );
};

const PluginJobQueueSearch: React.FC<{}> = props => {
  const api = useApi();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      newSearch(api, 'pluingJobQueue', {
        resource: { endPoint: 'plugin-job-queue', primaryKey: 'jobId' },
        condition: {},
        filter: {},
        sort: '{"jobId":-1}'
      })
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
