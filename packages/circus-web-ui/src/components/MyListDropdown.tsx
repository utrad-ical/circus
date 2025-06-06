import React from 'react';
import { useDispatch } from 'react-redux';
import { showMessage } from 'store/messages';
import { updateSearch } from 'store/searches';
import { useApi } from 'utils/api';
import useLoginUser from 'utils/useLoginUser';
import { SearchResult, selectionStatusChanged } from '../store/searches';
import DropdownButton from './DropdownButton';
import Icon from './Icon';
import IconButton from './IconButton';
import MenuItem from './MenuItem';

const MyListDropdown: React.FC<{
  resourceType: string;
  resourceIds: string[];
  searchName: string; // for refreshing search
}> = props => {
  const { resourceType, resourceIds, searchName } = props;

  const user = useLoginUser()!;
  const dispatch = useDispatch();
  const api = useApi();

  const handleAddRemove = async (
    operation: 'add' | 'remove',
    myListId: string
  ) => {
    const res = await api(`mylists/${myListId}/items`, {
      method: 'patch',
      data: { operation, resourceIds }
    });
    const changedCount = res.changedCount;
    const message = `${changedCount}${
      changedCount === 1 ? ' item was' : ' items were'
    } ${operation === 'add' ? 'added to the list.' : 'removed from the list.'}`;
    const onExecutePostProcess = (search: SearchResult) => {
      if (!search.params.resource.endPoint.includes(myListId)) return;
      const removedIds = search.selected.filter(
        selectedId => !search.results?.indexes.some(id => id === selectedId)
      );
      for (const removedId of removedIds) {
        dispatch(
          selectionStatusChanged({
            searchName,
            id: removedId,
            isSelected: false
          })
        );
      }
    };

    dispatch(showMessage(message, 'info', { short: true }));
    operation === 'remove' && searchName === 'myCaseList'
      ? dispatch(updateSearch(api, searchName, {}, onExecutePostProcess))
      : dispatch(updateSearch(api, searchName, {}));
  };

  const myLists = user.myLists.filter(
    list => list.resourceType === resourceType
  );

  return (
    <DropdownButton
      id="series-mylist-dropdown"
      size="sm"
      title={<Icon icon="material-folder_open" />}
    >
      {myLists.length > 0 &&
        myLists.map(list => (
          <MenuItem key={list.myListId}>
            <IconButton
              bsSize="xs"
              bsStyle="default"
              icon="material-add"
              onClick={() => handleAddRemove('add', list.myListId)}
            />
            &thinsp;
            <IconButton
              bsSize="xs"
              bsStyle="default"
              icon="material-close"
              onClick={() => handleAddRemove('remove', list.myListId)}
            />
            &nbsp;
            {list.name}
          </MenuItem>
        ))}
      {myLists.length === 0 && (
        <MenuItem disabled>(You have no my list)</MenuItem>
      )}
    </DropdownButton>
  );
};

export default MyListDropdown;
