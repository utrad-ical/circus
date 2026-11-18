import Badge from '#components/Badge.tsx';
import React, { useState, useEffect } from 'react';
import EditorPage from './EditorPage.tsx';
import { api } from '#utils/api.ts';
import LoadingIndicator from '#components/LoadingIndicator.tsx';
import MultiSelect from '#components/MultiSelect.tsx';
import Select from '#components/Select.tsx';
import * as et from '#components/editorTypes.tsx';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';
import type {
  Group,
  SearchResponse,
  UserCreate,
  UserForAdmin,
  UserPreferences
} from '@utrad-ical/circus-api-schema';

const makeEmptyItem = (): UserCreate => {
  return {
    userEmail: '',
    loginId: '',
    description: '',
    password: '',
    groups: [],
    preferences: { theme: 'mode_white', personalInfoView: false },
    loginEnabled: true
  };
};

type Preferences = Required<
  Pick<UserPreferences, 'theme' | 'personalInfoView'>
>;

const PreferenceEditor: React.FC<{
  value: Preferences;
  onChange: (newValue: Preferences) => void;
}> = props => {
  return (
    <div>
      <label>
        <span>Theme:</span>
        <Select
          options={{ mode_white: 'White', mode_black: 'Black' }}
          value={props.value.theme}
          onChange={(v: string | number) =>
            props.onChange({ ...props.value, theme: v as Preferences['theme'] })
          }
        />
      </label>
      <br />
      <label>
        <span>Show Personal Info:</span>&ensp;
        <input
          type="checkbox"
          checked={props.value.personalInfoView}
          onChange={e =>
            props.onChange({
              ...props.value,
              personalInfoView: e.target.checked
            })
          }
        />
      </label>
    </div>
  );
};

const UserAdmin: React.FC<any> = props => {
  const [editorProperties, setEditorProperties] = useState<any>(null);
  const [listColumns, setListColumns] = useState<
    DataGridColumnDefinition<UserForAdmin>[]
  >([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const { items: groups } = await api<SearchResponse<Group>>(
        'admin/groups?unlimited=1'
      );
      const groupIdMap: Record<number, string> = {};
      groups.forEach(g => (groupIdMap[g.groupId] = g.groupName));
      if (!isMounted) return;
      setEditorProperties([
        { caption: 'User Email', key: 'userEmail', editor: et.text() },
        { caption: 'Login Name', key: 'loginId', editor: et.text() },
        { caption: 'Description', key: 'description', editor: et.text() },
        { caption: 'Password', key: 'password', editor: et.password() },
        {
          caption: 'Groups',
          key: 'groups',
          editor: (props: any) => (
            <MultiSelect options={groupIdMap} numericalValue {...props} />
          )
        },
        {
          caption: 'Preferences',
          key: 'preferences',
          editor: PreferenceEditor
        },
        {
          caption: 'Login Enabled',
          key: 'loginEnabled',
          editor: et.checkbox({ label: 'enabled' })
        }
      ]);

      setListColumns([
        { key: 'userEmail', caption: 'User ID (E-mail)' },
        { key: 'loginId', caption: 'Login Name' },
        { key: 'description', caption: 'Description' },
        {
          key: 'groups',
          renderer: ({ value: item }) => {
            return (
              <>
                {item.groups.map(groupId => {
                  const group = groups.find(g => g.groupId === groupId);
                  if (!group) return null;
                  const style = group.privileges.includes('manageServer')
                    ? 'danger'
                    : 'default';
                  return (
                    <Badge variant={style} key={groupId}>
                      {group.groupName}
                    </Badge>
                  );
                })}
              </>
            );
          },
          caption: 'Groups'
        }
      ]);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!editorProperties || !listColumns) return <LoadingIndicator />;
  return (
    <EditorPage
      title="Users"
      icon="material-person"
      searchName="admin-user"
      resource={{ endPoint: 'admin/users', primaryKey: 'userEmail' }}
      editorProperties={editorProperties}
      listColumns={listColumns}
      makeEmptyItem={makeEmptyItem}
    />
  );
};

export default UserAdmin;
