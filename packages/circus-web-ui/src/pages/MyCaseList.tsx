import IconButton from '@smikitky/rb-components/lib/IconButton';
import { prompt, confirm } from '@smikitky/rb-components/lib/modal';
import Icon from 'components/Icon';
import MyListArray from 'components/MyListArray';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { dispatch } from 'store';
import { showMessage } from 'store/messages';
import * as s from 'store/searches';
import { useApi } from 'utils/api';
import { useLoginManager } from 'utils/loginManager';
import useLoginUser from 'utils/useLoginUser';
import CaseSearchResultsView from './search/CaseSearchResults';

const MyCaseListHome: React.FC<{}> = props => {
  const user = useLoginUser()!;
  const api = useApi();
  const loginmanager = useLoginManager();

  const lists = user.myLists.filter(
    list => list.resourceType === 'clinicalCases'
  );

  const handleCreateNew = async () => {
    const name = await prompt('Enter new list name');
    if (!name) return;
    await api('/mylists', { method: 'post', data: { name } });
    dispatch(
      showMessage(
        <>
          Created <b>{name}</b>.
        </>,
        'success',
        { short: true }
      )
    );
    loginmanager.refreshUserInfo(true);
  };

  const handleRename = async (myListId: string) => {
    const list = lists.find(list => myListId === list.myListId)!;
    const name = await prompt('New name', list.name);
    if (name === null || name === list.name) return;
    await api(`/mylists/${list.myListId}/name`, {
      method: 'put',
      data: { name }
    });
    dispatch(
      showMessage(
        <>
          Renamed <b>{list.name}</b> to <b>{name}</b>.
        </>,
        'success',
        { short: true, tag: 'mylist-rename' }
      )
    );
    loginmanager.refreshUserInfo(true);
  };

  const handleDelete = async (myListId: string) => {
    const list = lists.find(list => myListId === list.myListId)!;
    const ans = await confirm(
      <>
        Delete <b>{list.name}</b>? This cannot be undone.
      </>
    );
    if (!ans) return;
    await api(`/mylists/${list.myListId}`, { method: 'delete' });
    dispatch(
      showMessage(
        <>
          Deleted <b>{list.name}</b>.
        </>,
        'warning',
        { short: true }
      )
    );
    loginmanager.refreshUserInfo(true);
  };

  return (
    <div>
      <h1>
        <Icon icon="glyphicon-folder-open" /> My Case Lists
      </h1>
      <MyListArray
        value={user.myLists}
        toUrl={list => `/browse/case/mylist/${list.myListId}`}
        onRenameClick={handleRename}
        onDeleteClick={handleDelete}
      />
      {user.myLists.length === 0 && (
        <div className="alert alert-info">You have no my list.</div>
      )}
      <IconButton
        bsStyle="primary"
        icon="glyphicon-plus"
        onClick={handleCreateNew}
      >
        Create new case list
      </IconButton>
    </div>
  );
};

const MyListDetail: React.FC<{
  myListId: string;
}> = props => {
  const { myListId } = props;
  const user = useLoginUser()!;
  const list = user.myLists?.find(l => l.myListId === myListId);
  const dispatch = useDispatch();
  const api = useApi();

  useEffect(() => {
    const params = {
      resource: {
        endPoint: `cases/list/${myListId}`,
        resourceType: 'cases',
        primaryKey: 'caseId'
      },
      filter: {},
      condition: {},
      sort: JSON.stringify({ createdAt: -1 })
    };
    dispatch(s.newSearch(api, 'myCaseList', params, true));
  }, [api, dispatch, myListId]);

  if (!list) return <div>Not found</div>;

  return (
    <div>
      <h1>
        <Icon icon="glyphicon-folder-open" /> My Case List: {list.name}
      </h1>
      <CaseSearchResultsView searchName="myCaseList" refreshable={false} />
    </div>
  );
};

const MyCaseList: React.FC<{}> = props => {
  const { myListId } = useParams<{ myListId?: string }>();

  if (myListId === undefined) {
    return <MyCaseListHome />;
  } else {
    return <MyListDetail myListId={myListId} />;
  }
};

export default MyCaseList;
