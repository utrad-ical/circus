import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { SearchResource } from '#store/searches.ts';
import SeriesSearchResultsView from '../search/SeriesSearchResults.tsx';
import MyListPage from './MyListPage.tsx';

const MyCaseList: React.FC<{}> = props => {
  const { myListId } = useParams<{ myListId?: string }>();

  const resource = useMemo<SearchResource>(
    () => ({
      endPoint: `series/list/${myListId}`,
      resourceType: 'series',
      primaryKey: 'seriesUid'
    }),
    [myListId]
  );

  return (
    <MyListPage
      title="My Series List"
      resource={resource}
      resourceType="series"
      toUrl={myListId => `/browse/series/mylist/${myListId}`}
      searchName="mySeriesList"
      myListId={myListId}
      resultsView={SeriesSearchResultsView}
    />
  );
};

export default MyCaseList;
