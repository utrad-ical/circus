import u from '#components/utilities.module.css';
import Alert from '#components/Alert.tsx';
import Panel, {
  PanelHeader,
  PanelBody,
  PanelFooter
} from '#components/Panel.tsx';
import Button from '#components/Button.tsx';
import type { PropertyEditorProperties } from '#components/PropertyEditor.tsx';
import PropertyEditor from '#components/PropertyEditor.tsx';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import Icon from '#components/Icon.tsx';
import SearchResultsView from '#components/SearchResultsView.tsx';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch } from '#store/index.ts';
import type { SearchItem, SearchResource } from '#store/searches.ts';
import { newSearch } from '#store/searches.ts';
import styles from './EditorPage.module.css';
import { api } from '#utils/api.ts';
import { useLoginManager } from '#utils/loginManager.ts';
import AdminContainer from './AdminContainer.tsx';

type Subtitle = { icon?: string; title: string };

const emptyFilter = {};

const EditorPage = <Item extends SearchItem>(props: {
  listColumns: DataGridColumnDefinition<Item>[];
  searchName: string;
  resource: SearchResource & { primaryKey: keyof Item & string };
  title: string;
  subtitles?: Subtitle[];
  targetName?: (item: Item) => string;
  icon: string;
  makeEmptyItem: () => object;
  editorProperties: PropertyEditorProperties<any>;
  filter?: object;
  enableNewItem?: boolean;
}) => {
  const [editing, setEditing] = useState<
    { isNew: false; item: Item } | { isNew: true; item: object } | null
  >(null);
  const [complaints, setComplaints] = useState<{
    [key: string]: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );
  const loginManager = useLoginManager();
  const dispatch = useAppDispatch();

  const {
    listColumns,
    searchName,
    resource,
    title,
    subtitles,
    targetName,
    icon,
    makeEmptyItem,
    editorProperties,
    filter = emptyFilter,
    enableNewItem = true
  } = props;

  const loadItems = useCallback(async () => {
    dispatch(
      newSearch(searchName, {
        filter,
        condition: {},
        sort: '{}',
        resource
      })
    );
  }, [dispatch, resource, searchName, filter]);

  const target = editing && !editing.isNew ? editing.item : null;
  const targetId = target ? String(target[resource.primaryKey]) : null;
  const targetTitle = target ? (targetName?.(target) ?? targetId) : null;

  const handleEditStart = useCallback((index: number, item: Item) => {
    setEditing({ isNew: false, item });
    setErrorMessage(undefined);
    setComplaints({});
  }, []);

  const grid = useMemo(() => {
    return (props: { value: Item[]; active?: Item }) => (
      <DataGrid
        value={props.value}
        columns={listColumns}
        itemPrimaryKey={resource.primaryKey}
        onItemClick={handleEditStart}
        active={props.active}
      />
    );
  }, [listColumns, handleEditStart, resource.primaryKey]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const commitItem = async (item: Record<string, unknown>) => {
    const url =
      targetId === null
        ? resource.endPoint
        : resource.endPoint + '/' + encodeURIComponent(targetId);

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
      setEditing(null);
      await loadItems();
      loginManager.refreshUserInfo(true); // Full user data refresh
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message);
      setComplaints(complaintsFromIssues(err.response?.data?.issues));
    }
  };

  const handleCancelClick = () => {
    setEditing(null);
    setComplaints({});
    setErrorMessage(undefined);
  };

  const handleCreateItemClick = () => {
    setEditing({ isNew: true, item: makeEmptyItem() });
  };

  return (
    <AdminContainer title={title} icon={icon} className="admin-editor">
      <SearchResultsView
        name={searchName}
        dataView={grid}
        active={target ?? undefined}
      />
      {enableNewItem && (
        <p className={u.textRight}>
          <Button
            icon="material-add"
            variant="primary"
            size="small"
            onClick={handleCreateItemClick}
          >
            Create new
          </Button>
        </p>
      )}
      {editing && (
        <Editor
          key={targetId}
          item={editing.item}
          complaints={complaints}
          target={targetTitle}
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

const pickProperties = (
  item: object,
  properties: any[]
): Record<string, unknown> => {
  // Remove keys not in the editor property list
  const source = item as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const p of properties.flat()) {
    if (typeof p === 'object') result[p.key] = source[p.key];
  }
  return result;
};

/**
 * Converts the validation issues returned by the API server
 * (`issues` in a 400 response) into a map from
 * a property name to its error message.
 * Issues not tied to a property (e.g., an unknown property)
 * are omitted; they are shown via the error message.
 */
const complaintsFromIssues = (issues: unknown): { [key: string]: string } => {
  const result: { [key: string]: string } = {};
  if (!Array.isArray(issues)) return result;
  for (const issue of issues) {
    const key = issue?.path?.[0];
    if (typeof key === 'string' && !(key in result))
      result[key] = String(issue.message);
  }
  return result;
};

const Editor: React.FC<{
  target: string | null;
  properties: PropertyEditorProperties<any>;
  item: object;
  complaints: Record<string, string> | null;
  onSaveClick: (item: Record<string, unknown>) => void;
  onCancelClick: () => void;
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
    <Panel variant="primary">
      <PanelHeader>
        {target ? (
          <span>
            Updating: <strong>{target}</strong>
          </span>
        ) : (
          'Creating new item'
        )}
      </PanelHeader>
      <PanelBody>
        {subtitles ? (
          subtitles.map((subtitle, i) => (
            <React.Fragment key={i}>
              {i > 0 && <hr />}
              <div className={styles.subTitle}>
                {subtitle.icon && (
                  <>
                    <Icon icon={subtitle.icon} />
                    &nbsp;
                  </>
                )}
                {subtitle.title}
              </div>
              <PropertyEditor
                value={currentData}
                complaints={complaints ?? undefined}
                properties={filteredProperties(properties[i])}
                onChange={setCurrentData}
              />
            </React.Fragment>
          ))
        ) : (
          <PropertyEditor
            value={currentData}
            complaints={complaints ?? undefined}
            properties={filteredProperties(properties)}
            onChange={setCurrentData}
          />
        )}
        {errorMessage && (
          <>
            <hr />
            <Alert variant="danger">
              <strong>Error:</strong> {errorMessage}
            </Alert>
          </>
        )}
      </PanelBody>
      <PanelFooter className={u.textCenter}>
        <Button variant="link" onClick={onCancelClick}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </PanelFooter>
    </Panel>
  );
};
