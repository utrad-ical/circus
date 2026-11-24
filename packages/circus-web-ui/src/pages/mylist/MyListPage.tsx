import type { MyListResourceType } from '@utrad-ical/circus-api-schema';
import Icon from '#components/Icon.tsx';
import React, { useEffect } from 'react';
import { useAppDispatch } from '#store/index.ts';
import * as s from '#store/searches.ts';
import useLoginUser from '#utils/useLoginUser.ts';
import MyListHome from './MyListHome.tsx';

const MyListPage: React.FC<{
  myListId: string | undefined;
  searchName: string;
  title: string;
  resource: s.SearchResource;
  resourceType: MyListResourceType;
  toUrl: (myListId: string) => string;
  resultsView: React.ComponentType<{
    searchName: string;
    refreshable?: boolean;
  }>;
}> = props => {
  const {
    myListId,
    searchName,
    title,
    resource,
    resourceType,
    toUrl,
    resultsView: ResultsView
  } = props;
  const user = useLoginUser()!;
  const list = user.myLists?.find(l => l.myListId === myListId);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!myListId) return;
    const params = {
      resource,
      filter: {},
      condition: {},
      sort: JSON.stringify({ createdAt: -1 })
    };
    dispatch(s.newSearch(searchName, params, true));
  }, [dispatch, myListId, resource, searchName]);

  if (!myListId) {
    return (
      <MyListHome title={title} toUrl={toUrl} resourceType={resourceType} />
    );
  }

  if (!list) return <div>Not found</div>;

  return (
    <div>
      <h1>
        <Icon icon="material-folder_open" /> {title}: {list.name}
      </h1>
      <ResultsView searchName={searchName} refreshable={false} />
    </div>
  );
};

export default MyListPage;
