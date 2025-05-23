import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import * as et from '@smikitky/rb-components/lib/editor-types';
import { DataGridColumnDefinition } from 'components/DataGrid';
import PluginSelectorMultiple from 'components/PluginSelectorMultiple';
import ProjectSelectorMultiple from 'components/ProjectSelectorMultiple';
import React, { useEffect, useState } from 'react';
import { useApi } from 'utils/api';
import EditorPage from './EditorPage';

const makeEmptyItem = () => {
  return {
    groupName: 'untitled group',
    privileges: [],
    domains: [],
    readProjects: [],
    writeProjects: [],
    addSeriesProjects: [],
    viewPersonalInfoProjects: [],
    moderateProjects: [],
    readPlugin: [],
    executePlugin: [],
    manageJobs: [],
    inputPersonalFeedback: [],
    inputConsensualFeedback: [],
    manageFeedback: [],
    viewPersonalInfo: []
  };
};

const listColumns: DataGridColumnDefinition<{
  privileges: string[];
  domains: string[];
}>[] = [
  { key: 'groupName', caption: 'Group Name' },
  {
    caption: 'Privileges',
    className: 'privileges',
    renderer: ({ value: item }) => {
      return (
        <>
          {item.privileges.map((priv, i) => {
            const style = priv === 'manageServer' ? 'danger' : 'primary';
            return (
              <span key={i} className={`label label-${style}`}>
                {priv}
              </span>
            );
          })}
        </>
      );
    }
  },
  {
    caption: 'Accessible Series Domains',
    className: 'domains',
    renderer: ({ value: item }) => (
      <>
        {item.domains.map((d, i) => (
          <span key={i} className="label label-default">
            {d}
          </span>
        ))}
      </>
    )
  }
];

const GroupAdmin: React.FC<any> = props => {
  const [editorProperties, setEditorProperties] = useState<any>(null);
  const api = useApi();

  useEffect(() => {
    let isMounted = true;
    const didMount = async () => {
      const domains = await api('admin/server-params/domains');
      const privList = await api('admin/global-privileges');
      const privileges: { [name: string]: string } = {};
      for (const p of privList) privileges[p.privilege] = p.caption;

      const projects = (await api('admin/projects?unlimited=1')).items as {
        projectId: string;
      }[];
      const projectOptions = projects.map(project => ({
        projectId: project.projectId,
        project
      }));
      const projectSelect: React.FC<any> = props => (
        <ProjectSelectorMultiple projects={projectOptions} {...props} />
      );

      const plugins = (await api('admin/plugins?unlimited=1')).items as {
        pluginId: string;
      }[];
      const pluginOptions = plugins.map(plugin => ({
        pluginId: plugin.pluginId,
        plugin
      }));
      const pluginSelect: React.FC<any> = props => (
        <PluginSelectorMultiple plugins={pluginOptions} {...props} />
      );
      if (!isMounted) return;
      setEditorProperties([
        [
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
          }
        ],
        [
          {
            key: 'readProjects',
            caption: 'Read Cases',
            editor: projectSelect
          },
          {
            key: 'writeProjects',
            caption: 'Write New Cases',
            editor: projectSelect
          },
          {
            key: 'addSeriesProjects',
            caption: 'Add Series',
            editor: projectSelect
          },
          {
            key: 'viewPersonalInfoProjects',
            caption: 'View Personal Info',
            editor: projectSelect
          },
          {
            key: 'moderateProjects',
            caption: 'Moderate Cases',
            editor: projectSelect
          }
        ],
        [
          {
            key: 'readPlugin',
            caption: 'Read Results',
            editor: pluginSelect
          },
          {
            key: 'executePlugin',
            caption: 'Execute New Plug-in Jobs',
            editor: pluginSelect
          },
          {
            key: 'manageJobs',
            caption: 'Manage Plug-in Jobs',
            editor: pluginSelect
          },
          {
            key: 'inputPersonalFeedback',
            caption: 'Input Personal Feedback',
            editor: pluginSelect
          },
          {
            key: 'inputConsensualFeedback',
            caption: 'Input Consensual Feedback',
            editor: pluginSelect
          },
          {
            key: 'manageFeedback',
            caption: 'Manage Feedback',
            editor: pluginSelect
          },
          {
            key: 'viewPersonalInfo',
            caption: 'View Personal Info',
            editor: pluginSelect
          }
        ]
      ]);
    };
    didMount();

    return () => {
      isMounted = false;
    };
  }, [api]);

  if (!editorProperties) return <LoadingIndicator />;
  return (
    <EditorPage
      title="User Groups"
      icon="material-radio_button_checked"
      searchName="admin-group"
      resource={{ endPoint: 'admin/groups', primaryKey: 'groupId' }}
      editorProperties={editorProperties}
      listColumns={listColumns}
      makeEmptyItem={makeEmptyItem}
      targetName={item => item.groupName}
      subtitles={[
        { icon: 'material-radio_button_checked', title: 'General' },
        { icon: 'circus-case', title: 'CIRCUS DB (Project based preferences)' },
        { icon: 'circus-job', title: 'CIRCUS CS (Plug-in based preferences)' }
      ]}
    />
  );
};

export default GroupAdmin;
