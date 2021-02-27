import Icon from 'components/Icon';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import * as s from 'store/searches';
import { useApi } from 'utils/api';
import useLoginUser from 'utils/useLoginUser';
import MyListHome from './MyListHome';

const MyListPage: React.FC<{
  myListId: string | undefined;
  searchName: string;
  title: string;
  resource: s.SearchResource;
  resourceType: string;
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
  const dispatch = useDispatch();
  const api = useApi();

  useEffect(() => {
    if (!myListId) return;
    const params = {
      resource,
      filter: {},
      condition: {},
      sort: JSON.stringify({ createdAt: -1 })
    };
    dispatch(s.newSearch(api, searchName, params, true));
  }, [api, dispatch, myListId, resource, searchName]);

  if (!myListId) {
    return (
      <MyListHome title={title} toUrl={toUrl} resourceType={resourceType} />
    );
  }

  if (!list) return <div>Not found</div>;

  return (
    <div>
      <h1>
        <Icon icon="glyphicon-folder-open" /> {title}: {list.name}
      </h1>
      <ResultsView searchName={searchName} refreshable={false} />
    </div>
  );
};

export default MyListPage;
