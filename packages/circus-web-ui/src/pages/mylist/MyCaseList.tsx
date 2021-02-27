import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { SearchResource } from 'store/searches';
import CaseSearchResultsView from '../search/CaseSearchResults';
import MyListPage from './MyListPage';

const MyCaseList: React.FC<{}> = props => {
  const { myListId } = useParams<{ myListId?: string }>();

  const resource = useMemo<SearchResource>(
    () => ({
      endPoint: `cases/list/${myListId}`,
      resourceType: 'cases',
      primaryKey: 'caseId'
    }),
    [myListId]
  );

  return (
    <MyListPage
      title="My Case List"
      resource={resource}
      resourceType="clinicalCases"
      toUrl={myListId => `/browse/case/mylist/${myListId}`}
      searchName="myCaseList"
      myListId={myListId}
      resultsView={CaseSearchResultsView}
    />
  );
};

export default MyCaseList;
