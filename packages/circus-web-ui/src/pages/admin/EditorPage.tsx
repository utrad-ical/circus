import IconButton from '@smikitky/rb-components/lib/IconButton';
import PropertyEditor, {
  PropertyEditorProperties
} from '@smikitky/rb-components/lib/PropertyEditor';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import Icon from 'components/Icon';
import SearchResultsView from 'components/SearchResultsView';
import { Button, Panel } from 'components/react-bootstrap';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { SearchResource, newSearch } from 'store/searches';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import { useLoginManager } from 'utils/loginManager';
import AdminContainer from './AdminContainer';

const StyledDataGrid = styled(DataGrid)`
  .label {
    margin-left: 1px;
    margin-right: 1px;
  }
`;

const StyledSubTitle = styled.div`
  font-weight: bold;
  font-size: 110%;
  margin: 10px 0;
`;

type Subtitle = { icon?: string; title: string };

const EditorPage: React.FC<{
  listColumns: DataGridColumnDefinition[];
  preCommitHook?: (target: any) => Promise<boolean | void>;
  searchName: string;
  resource: SearchResource;
  title: string;
  subtitles?: Subtitle[];
  targetName?: (item: any) => string;
  icon: string;
  makeEmptyItem: () => any;
  editorProperties: PropertyEditorProperties<any>;
}> = props => {
  const [target, setTarget] = useState<any | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [complaints, setComplaints] = useState<{
    [key: string]: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );
  const loginManager = useLoginManager();
  const api = useApi();
  const dispatch = useDispatch();

  const {
    listColumns,
    preCommitHook,
    searchName,
    resource,
    title,
    subtitles,
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
        resource: {
          endPoint: resource.endPoint,
          primaryKey: resource.primaryKey
        }
      })
    );
  }, [api, dispatch, resource.endPoint, resource.primaryKey, searchName]);

  const handleEditStart = useCallback(
    (index, item) => {
      const makeTargetName = (item: any) => {
        if (targetName) return targetName(item);
        return item[resource.primaryKey];
      };
      setTarget(makeTargetName(item));
      setEditing(item);
      setErrorMessage(undefined);
      setComplaints({});
    },
    [targetName, resource.primaryKey]
  );

  const grid = useMemo(() => {
    return (props => (
      <StyledDataGrid
        value={props.value}
        columns={listColumns}
        itemPrimaryKey={resource.primaryKey}
        onItemClick={handleEditStart}
        active={props.active}
      />
    )) as React.FC<any>;
  }, [listColumns, handleEditStart, resource.primaryKey]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const commitItem = async (item: any) => {
    if (preCommitHook) {
      if (!(await preCommitHook(target))) return;
    }

    const url = target
      ? resource.endPoint +
        '/' +
        encodeURIComponent(editing[resource.primaryKey]) // Update
      : resource.endPoint; // Create new

    if (target && resource.primaryKey in item) {
      item = { ...item };
      delete item[resource.primaryKey];
    }

    const args = {
      method: target ? 'patch' : 'post',
      data: item,
      handleErrors: [400]
    };
    try {
      await api(url, args);
      setTarget(null);
      setEditing(null);
      await loadItems();
      loginManager.refreshUserInfo(true); // Full user data refresh
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message);
      setComplaints(err.data.errors);
    }
  };

  const handleCancelClick = () => {
    setEditing(null);
    setComplaints({});
    setErrorMessage(undefined);
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
          excludeProperty={target ? resource.primaryKey : undefined}
          subtitles={subtitles}
          onSaveClick={commitItem}
          onCancelClick={handleCancelClick}
          errorMessage={errorMessage}
        />
      )}
    </AdminContainer>
  );
};

export default EditorPage;

const pickProperties = (item: any, properties: any[]): any => {
  // Remove keys not in the editor property list
  const result: any = {};
  for (const p of properties.flat()) {
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
  subtitles?: Subtitle[];
  errorMessage?: string;
}> = props => {
  const {
    target,
    properties,
    item,
    complaints,
    onSaveClick = () => {},
    onCancelClick = () => {},
    excludeProperty,
    subtitles,
    errorMessage
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

  const filteredProperties = (targetProperties: any) =>
    targetProperties.filter(
      (p: any) => !excludeProperty || excludeProperty !== p.key
    );

  return (
    <Panel bsStyle="primary">
      <Panel.Heading>
        {target ? (
          <span>
            Updating: <strong>{target}</strong>
          </span>
        ) : (
          'Creating new item'
        )}
      </Panel.Heading>
      <Panel.Body>
        {subtitles ? (
          subtitles.map((subtitle, i) => (
            <React.Fragment key={i}>
              {i > 0 && <hr />}
              <StyledSubTitle>
                {subtitle.icon && (
                  <>
                    <Icon icon={subtitle.icon} />
                    &nbsp;
                  </>
                )}
                {subtitle.title}
              </StyledSubTitle>
              <PropertyEditor
                value={currentData}
                complaints={complaints}
                properties={filteredProperties(properties[i])}
                onChange={setCurrentData}
              />
            </React.Fragment>
          ))
        ) : (
          <PropertyEditor
            value={currentData}
            complaints={complaints}
            properties={filteredProperties(properties)}
            onChange={setCurrentData}
          />
        )}
        {errorMessage && (
          <>
            <hr />
            <div className="alert alert-danger">
              <strong>Error:</strong> {errorMessage}
            </div>
          </>
        )}
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
