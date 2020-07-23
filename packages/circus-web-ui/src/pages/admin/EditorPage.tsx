import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Panel } from 'components/react-bootstrap';
import IconButton from '@smikitky/rb-components/lib/IconButton';
import PropertyEditor from '@smikitky/rb-components/lib/PropertyEditor';
import { useApi } from 'utils/api';
import { useLoginManager } from 'utils/loginManager';
import AdminContainer from './AdminContainer';
import { newSearch } from 'store/searches';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import SearchResultsView from 'components/SearchResultsView';
import { useDispatch } from 'react-redux';

const EditorPage: React.FC<{
  listColumns: DataGridColumnDefinition[];
  preCommitHook?: (target: any) => Promise<boolean | void>;
  primaryKey: string;
  searchName: string;
  resource: string;
  title: string;
  targetName?: (item: any) => string;
  icon: string;
  makeEmptyItem: () => any;
  editorProperties: any;
}> = props => {
  const [target, setTarget] = useState<any | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [complaints, setComplaints] = useState<{
    [key: string]: string;
  } | null>(null);
  const loginManager = useLoginManager();
  const api = useApi();
  const dispatch = useDispatch();

  const {
    listColumns,
    preCommitHook,
    primaryKey,
    searchName,
    resource,
    title,
    targetName,
    icon,
    makeEmptyItem,
    editorProperties
  } = props;

  const loadItems = useCallback(async () => {
    dispatch(
      newSearch(api, searchName, {
        filter: {},
        condition: {},
        sort: '{}',
        resource
      })
    );
  }, [api, dispatch, resource, searchName]);

  const handleEditStart = useCallback(
    (index, item) => {
      const makeTargetName = (item: any) => {
        if (targetName) return targetName(item);
        return item[primaryKey];
      };
      setTarget(makeTargetName(item));
      setEditing(item);
      setComplaints({});
    },
    [targetName, primaryKey]
  );

  const grid = useMemo(() => {
    return (props => (
      <DataGrid
        value={props.value}
        columns={listColumns}
        onItemClick={handleEditStart}
        active={props.active}
      />
    )) as React.FC<any>;
  }, [listColumns, handleEditStart]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const commitItem = async (item: any) => {
    if (preCommitHook) {
      if (!(await preCommitHook(target))) return;
    }

    let url = resource;
    if (target) {
      url += '/' + encodeURIComponent(editing[primaryKey]);
    }

    if (target && primaryKey in item) {
      item = { ...item };
      delete item[primaryKey];
    }

    const args = {
      method: target ? 'put' : 'post',
      data: item,
      handleErrors: [400]
    };
    try {
      await api(url, args);
      setTarget(null);
      setEditing(null);
      await loadItems();
      loginManager.refreshUserInfo(true); // Full user data refresh
    } catch (err) {
      setComplaints(err.data.errors);
    }
  };

  const handleCancelClick = () => {
    setEditing(null);
    setComplaints({});
  };

  const handleCreateItemClick = () => {
    setTarget(null);
    setEditing(makeEmptyItem());
  };

  return (
    <AdminContainer title={title} icon={icon} className="admin-editor">
      <SearchResultsView name={searchName} dataView={grid} active={editing} />
      <p className="text-right">
        <IconButton
          icon="plus"
          bsStyle="primary"
          bsSize="small"
          onClick={handleCreateItemClick}
        >
          Create new
        </IconButton>
      </p>
      {editing && (
        <Editor
          key={target}
          item={editing}
          complaints={complaints}
          target={target}
          properties={editorProperties}
          excludeProperty={target ? props.primaryKey : undefined}
          onSaveClick={commitItem}
          onCancelClick={handleCancelClick}
        />
      )}
    </AdminContainer>
  );
};

export default EditorPage;

const pickProperties = (item: any, properties: any[]): any => {
  // Remove keys not in the editor property list
  const result: any = {};
  for (const p of properties) {
    result[p.key] = item[p.key];
  }
  return result;
};

const Editor: React.FC<{
  target: string;
  properties: any;
  item: any;
  complaints: any;
  onSaveClick: any;
  onCancelClick: any;
  excludeProperty?: string;
}> = props => {
  const {
    target,
    properties,
    item,
    complaints,
    onSaveClick = () => {},
    onCancelClick = () => {},
    excludeProperty
  } = props;

  const [currentData, setCurrentData] = useState(() =>
    pickProperties(item, properties)
  );

  useEffect(() => {
    setCurrentData(pickProperties(item, properties));
  }, [properties, item]);

  const handleSave = () => {
    onSaveClick(currentData);
  };

  const filteredProperties = properties.filter(
    (p: any) => !excludeProperty || excludeProperty !== p.key
  );

  return (
    <Panel bsStyle="primary">
      <Panel.Heading>
        {props.target ? (
          <span>
            Updating: <strong>{props.target}</strong>
          </span>
        ) : (
          'Creating new item'
        )}
      </Panel.Heading>
      <Panel.Body>
        <PropertyEditor
          value={currentData}
          complaints={complaints}
          properties={filteredProperties}
          onChange={setCurrentData}
        />
      </Panel.Body>
      <Panel.Footer className="text-center">
        <Button bsStyle="link" onClick={onCancelClick}>
          Cancel
        </Button>
        <Button bsStyle="primary" onClick={handleSave}>
          Save
        </Button>
      </Panel.Footer>
    </Panel>
  );
};
