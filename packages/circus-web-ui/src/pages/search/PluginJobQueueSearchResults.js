import React from 'react';
import SearchResultsView, {
  makeSortOptions
} from '../../components/SearchResultsView';

const sortOptions = makeSortOptions({
  jobId: 'job id'
});

const DataView = props => {
  const { value } = props;
  if (!value.length) {
    return <div>No plug-in job in execution queue.</div>;
  }
  return <ul>{value.map(item => <li key={item.jobId}>{item}</li>)}</ul>;
};

const PluginJobQueueSearchResults = props => {
  return (
    <div>
      <SearchResultsView
        sortOptions={sortOptions}
        dataView={DataView}
        refreshable
        name="pluingJobQueue"
      />
    </div>
  );
};

export default PluginJobQueueSearchResults;
