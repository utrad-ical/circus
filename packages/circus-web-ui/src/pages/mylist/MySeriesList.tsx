import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { SearchResource } from 'store/searches';
import SeriesSearchResultsView from '../search/SeriesSearchResults';
import MyListPage from './MyListPage';

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
