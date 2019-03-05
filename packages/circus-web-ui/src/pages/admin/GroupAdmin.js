import EditorPage from './EditorPage';
import React, { useState, useEffect } from 'react';
import { useApi } from 'utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';
import * as et from 'rb/editor-types';
import ProjectSelectorMultiple from 'components/ProjectSelectorMultiple';

const makeEmptyItem = () => {
  return {
    groupName: 'untitled group',
    privileges: [],
    domains: [],
    readProjects: [],
    writeProjects: [],
    addSeriesProjects: [],
    viewPersonalInfoProjects: [],
    moderateProjects: []
  };
};

const listColumns = [
  { key: 'groupName', caption: 'Group Name' },
  {
    caption: 'Privileges',
    className: 'privileges',
    renderer: ({ value: item }) => {
      return item.privileges.map((priv, i) => {
        const style = priv === 'manageServer' ? 'danger' : 'primary';
        return (
          <span key={i} className={`label label-${style}`}>
            {priv}
          </span>
        );
      });
    }
  },
  {
    caption: 'Accessible Series Domains',
    className: 'domains',
    renderer: ({ value: item }) =>
      item.domains.map((d, i) => (
        <span key={i} className="label label-default">
          {d}
        </span>
      ))
  }
];

const GroupAdmin = props => {
  const [editorProperties, setEditorProperties] = useState(null);

  const didMount = async () => {
    const domains = await api('admin/server-params/domains');
    const privList = await api('admin/global-privileges');
    const privileges = {};
    for (const p of privList) privileges[p.privilege] = p.caption;

    const projects = (await api('admin/projects')).items;
    const projectOptions = projects.map(project => ({
      projectId: project.projectId,
      project
    }));
    const projectSelect = props => (
      <ProjectSelectorMultiple projects={projectOptions} {...props} />
    );

    setEditorProperties([
      { key: 'groupName', caption: 'Group Name', editor: et.text() }, // 0
      {
        key: 'privileges',
        caption: 'Privileges',
        editor: et.multiSelect(privileges, { type: 'checkbox' })
      },
      {
        key: 'domains',
        caption: 'Accessible Domains',
        editor: et.multiSelect(domains, { type: 'checkbox' })
      },
      {
        key: 'readProjects',
        caption: 'Readable Projects',
        editor: projectSelect
      },
      {
        key: 'writeProjects',
        caption: 'Writable Projects',
        editor: projectSelect
      },
      {
        key: 'addSeriesProjects',
        caption: 'Add Series Projects',
        editor: projectSelect
      },
      {
        key: 'viewPersonalInfoProjects',
        caption: 'View Personal Info Projects',
        editor: projectSelect
      },
      {
        key: 'moderateProjects',
        caption: 'Moderate Projects',
        editor: projectSelect
      }
    ]);
  };

  useEffect(() => {
    didMount();
  }, []);
  const api = useApi();

  if (!editorProperties) return <LoadingIndicator />;
  return (
    <EditorPage
      title="User Groups"
      icon="record"
      searchName="admin-group"
      resource="admin/groups"
      primaryKey="groupId"
      editorProperties={editorProperties}
      listColumns={listColumns}
      makeEmptyItem={makeEmptyItem}
      targetName={item => item.groupName}
    />
  );
};

export default GroupAdmin;
