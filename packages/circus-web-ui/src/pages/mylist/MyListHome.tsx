import Button from '#components/Button.tsx';
import { confirm, prompt } from '#components/dialogs.tsx';
import Icon from '#components/Icon.tsx';
import MyListArray from './MyListArray.tsx';
import React from 'react';
import { dispatch } from '#store/index.ts';
import { showMessage } from '#store/messages.ts';
import { useApi } from '#utils/api.ts';
import { useLoginManager } from '#utils/loginManager.ts';
import useLoginUser from '#utils/useLoginUser.ts';

const MyListHome: React.FC<{
  title: string;
  resourceType: string;
  toUrl: (myListId: string) => string;
}> = props => {
  const { title, resourceType, toUrl } = props;
  const user = useLoginUser()!;
  const api = useApi();
  const loginmanager = useLoginManager();

  const lists = user.myLists.filter(list => list.resourceType === resourceType);

  const handleCreateNew = async () => {
    const name = await prompt('Enter new list name');
    if (!name) return;
    await api('/mylists', {
      method: 'post',
      data: { name, resourceType, public: false }
    });
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
    await api(`/mylists/${list.myListId}`, {
      method: 'patch',
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
        <Icon icon="material-folder_open" /> {title}
      </h1>
      <MyListArray
        value={lists}
        toUrl={toUrl}
        onRenameClick={handleRename}
        onDeleteClick={handleDelete}
      />
      {lists.length === 0 && (
        <div className="alert alert-info">
          You have no my list for this resource type.
        </div>
      )}
      <Button variant="primary" icon="material-add" onClick={handleCreateNew}>
        Create new my list
      </Button>
    </div>
  );
};

export default MyListHome;
