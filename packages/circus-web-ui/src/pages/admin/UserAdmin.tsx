import React, { useState, useEffect } from 'react';
import EditorPage from './EditorPage';
import { useApi } from 'utils/api';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import MultiSelect from '@smikitky/rb-components/lib/MultiSelect';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import classnames from 'classnames';
import * as et from '@smikitky/rb-components/lib/editor-types';
import { DataGridColumnDefinition } from 'components/DataGrid';

const makeEmptyItem = () => {
  return {
    userEmail: '',
    loginID: '',
    description: '',
    password: '',
    groups: [],
    preferences: { theme: 'mode_white', personalInfoView: false },
    loginEnabled: true
  };
};

interface Preferences {
  theme: string;
  personalInfoView: boolean;
}

const PreferenceEditor: React.FC<{
  value: Preferences;
  onChange: (newValue: Preferences) => void;
}> = props => {
  return (
    <div>
      <label>
        <span>Theme:</span>
        <ShrinkSelect
          options={{ mode_white: 'White', mode_black: 'Black' }}
          value={props.value.theme}
          onChange={(v: string | number) =>
            props.onChange({ ...props.value, theme: v as string })
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
  const [listColumns, setListColumns] = useState<DataGridColumnDefinition[]>(
    []
  );
  const api = useApi();

  useEffect(() => {
    const load = async () => {
      const groups = (await api('admin/groups')).items as {
        groupId: string;
        groupName: string;
        privileges: string[];
      }[];
      const groupIdMap: any = {};
      groups.forEach(g => (groupIdMap[g.groupId] = g.groupName));
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
            return item.groups.map((groupId: string) => {
              const group = groups.find(g => g.groupId === groupId)!;
              const style =
                group.privileges.indexOf('manageServer') >= 0
                  ? 'label-danger'
                  : 'label-default';
              return (
                <span className={classnames('label', style)} key={groupId}>
                  {group.groupName}
                </span>
              );
            });
          },
          caption: 'Groups'
        }
      ]);
    };
    load();
  }, [api]);

  if (!editorProperties || !listColumns) return <LoadingIndicator />;
  return (
    <EditorPage
      title="Users"
      icon="user"
      searchName="admin-user"
      resource={{ endPoint: 'admin/users', primaryKey: 'userEmail' }}
      editorProperties={editorProperties}
      listColumns={listColumns}
      makeEmptyItem={makeEmptyItem}
    />
  );
};

export default UserAdmin;
