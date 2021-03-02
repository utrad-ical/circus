import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { SearchResource } from 'store/searches';
import PluginJobSearchResults from '../search/PluginJobSearchResults';
import MyListPage from './MyListPage';

const MyPluginJobList: React.FC<{}> = props => {
  const { myListId } = useParams<{ myListId?: string }>();

  const resource = useMemo<SearchResource>(
    () => ({
      endPoint: `plugin-jobs/list/${myListId}`,
      resourceType: 'pluginJobs',
      primaryKey: 'jobId'
    }),
    [myListId]
  );

  return (
    <MyListPage
      title="My Plugin Job List"
      resource={resource}
      resourceType="pluginJobs"
      toUrl={myListId => `/browse/plugin-jobs/mylist/${myListId}`}
      searchName="mySeriesList"
      myListId={myListId}
      resultsView={PluginJobSearchResults}
    />
  );
};

export default MyPluginJobList;
