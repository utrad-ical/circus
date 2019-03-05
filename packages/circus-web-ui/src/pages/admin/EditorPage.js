import React, { useState, useEffect, useMemo } from 'react';
import { Button, Panel } from 'components/react-bootstrap';
import IconButton from 'rb/IconButton';
import PropertyEditor from 'rb/PropertyEditor';
import { useApi } from 'utils/api.js';
import { useLoginManager } from 'utils/loginManager';
import AdminContainer from './AdminContainer';
import { startNewSearch } from 'actions';
import DataGrid from 'components/DataGrid';
import SearchResultsView from 'components/SearchResultsView';
import { connect } from 'react-redux';

const EditorPage = props => {
  const [target, setTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [complaints, setComplaints] = useState(null);
  const loginManager = useLoginManager();
  const api = useApi();

  const {
    listColumns,
    dispatch,
    preCommitHook,
    primaryKey,
    searchName,
    resource,
    title,
    icon
  } = props;

  const grid = useMemo(
    () => {
      return props => (
        <DataGrid
          value={props.value}
          columns={listColumns}
          onItemClick={handleEditStart}
          active={props.active}
        />
      );
    },
    [props.listColumns]
  );

  useEffect(() => {
    loadItems();
  }, []);

  const commitItem = async item => {
    if (preCommitHook) {
      if (!await preCommitHook(target)) return;
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

  const loadItems = async () => {
    dispatch(startNewSearch(api, searchName, resource, {}, {}, {}));
  };

  const targetName = item => {
    if (props.targetName) return props.targetName(item);
    return item[props.primaryKey];
  };

  const handleEditStart = (index, item) => {
    setTarget(targetName(item));
    setEditing(item);
    setComplaints({});
  };

  const handleCancelClick = () => {
    setEditing(null);
    setComplaints({});
  };

  const handleCreateItemClick = () => {
    setTarget(null);
    setEditing(props.makeEmptyItem());
  };

  return (
    <AdminContainer title={title} icon={icon} className="admin-editor">
      <SearchResultsView
        name={searchName}
        dataView={grid}
        active={editing}
        onItemClick={handleEditStart}
      />
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
          item={editing}
          complaints={complaints}
          target={target}
          properties={props.editorProperties}
          excludeProperty={target ? props.primaryKey : null}
          onSaveClick={commitItem}
          onCancelClick={handleCancelClick}
        />
      )}
    </AdminContainer>
  );
};

export default connect()(EditorPage);

const Editor = props => {
  const pickProperties = () => {
    // Remove keys not in the editor property list
    const result = {};
    for (const p of props.properties) {
      result[p.key] = props.item[p.key];
    }
    return result;
  };

  const [currentData, setCurrentData] = useState(() => pickProperties());

  useEffect(
    () => {
      setCurrentData(pickProperties());
    },
    [props.properties, props.item]
  );

  const handleSave = () => {
    props.onSaveClick && props.onSaveClick(currentData);
  };

  const properties = props.properties.filter(
    p => !props.excludeProperty || props.excludeProperty !== p.key
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
          complaints={props.complaints}
          properties={properties}
          onChange={setCurrentData}
        />
      </Panel.Body>
      <Panel.Footer className="text-center">
        <Button bsStyle="link" onClick={props.onCancelClick}>
          Cancel
        </Button>
        <Button bsStyle="primary" onClick={handleSave}>
          Save
        </Button>
      </Panel.Footer>
    </Panel>
  );
};
