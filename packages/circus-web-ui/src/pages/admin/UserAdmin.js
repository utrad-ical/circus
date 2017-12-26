import React from 'react';
import EditorPage from './EditorPage';
import { api } from 'utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';
import MultiSelect from 'rb/MultiSelect';
import ShrinkSelect from 'rb/ShrinkSelect';
import classnames from 'classnames';
import * as et from 'rb/editor-types';

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

const PreferenceEditor = props => {
  return (
    <div>
      <label>
        <span>Theme:</span>
        <ShrinkSelect
          options={{ mode_white: 'White', mode_black: 'Black' }}
          value={props.value.theme}
          onChange={v => props.onChange({ ...props.value, theme: v })}
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

export default class UserAdmin extends React.Component {
  constructor(props) {
    super(props);

    this.state = { ready: false };

    this.listColumns = [
      { key: 'userEmail', caption: 'User ID (E-mail)' },
      { key: 'loginId', caption: 'Login Name' },
      { key: 'description', caption: 'Description' },
      {
        renderer: ({ value: item }) => {
          return item.groups.map(groupId => {
            if (!this.groups) return null;
            const group = this.groups.find(g => g.groupId === groupId);
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
    ];

    this.editorProperties = [
      { caption: 'User Email', key: 'userEmail', editor: et.text() },
      { caption: 'Login Name', key: 'loginId', editor: et.text() },
      { caption: 'Description', key: 'description', editor: et.text() },
      { caption: 'Password', key: 'password', editor: et.password() },
      { caption: 'Groups', key: 'groups', editor: null },
      { caption: 'Preferences', key: 'preferences', editor: PreferenceEditor },
      {
        caption: 'Login Enabled',
        key: 'loginEnabled',
        editor: et.checkbox({ label: 'enabled' })
      }
    ];
  }

  async componentDidMount() {
    this.groups = (await api('admin/groups')).items;
    const groupIdMap = {};
    this.groups.forEach(g => (groupIdMap[g.groupId] = g.groupName));
    this.editorProperties[4].editor = props => (
      <MultiSelect options={groupIdMap} numericalValue {...props} />
    );
    this.setState({ ready: true });
  }

  render() {
    if (!this.state.ready) return <LoadingIndicator />;
    return (
      <EditorPage
        title="Users"
        icon="user"
        searchName="admin-user"
        endPoint="admin/users"
        primaryKey="userEmail"
        editorProperties={this.editorProperties}
        listColumns={this.listColumns}
        makeEmptyItem={makeEmptyItem}
      />
    );
  }
}
