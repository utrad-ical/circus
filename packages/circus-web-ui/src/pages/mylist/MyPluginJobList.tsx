import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { SearchResource } from '#store/searches.ts';
import PluginJobSearchResults from '../search/PluginJobSearchResults.tsx';
import MyListPage from './MyListPage.tsx';

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
      title="My Plug-in Job List"
      resource={resource}
      resourceType="pluginJobs"
      toUrl={myListId => `/browse/plugin-jobs/mylist/${myListId}`}
      searchName="myPluginJobList"
      myListId={myListId}
      resultsView={PluginJobSearchResults}
    />
  );
};

export default MyPluginJobList;
