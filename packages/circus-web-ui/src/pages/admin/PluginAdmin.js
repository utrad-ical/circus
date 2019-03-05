import EditorPage from './EditorPage';
import React, { Fragment } from 'react';
import BodyPartIcon from 'components/BodyPartIcon';
import IconEditor from './IconEditor';
import * as et from 'rb/editor-types';

const makeEmptyItem = () => {
  return {
    pluginName: 'new plugin',
    pluginVersion: '1.0.1',
    icon: {
      glyph: 'calc',
      color: '#ffffff',
      backgroundColor: '#555555'
    }
  };
};

const listColumns = [
  {
    key: 'pluginId',
    caption: 'Plug-in ID',
    renderer: ({ value: plugin }) => (
      <Fragment>{plugin.pluginId.substring(0, 12)}</Fragment>
    )
  },
  {
    key: 'pluginName',
    caption: 'Plug-in Name',
    renderer: ({ value: plugin }) => (
      <span>
        <BodyPartIcon icon={plugin.icon} size="lg" />
        &ensp;
        {plugin.pluginName}
      </span>
    )
  },
  { key: 'version', caption: 'Version' },
  { key: 'description', caption: 'Description' }
];

const editorProperties = [
  { key: 'pluginName', caption: 'Plug-in Name', editor: et.text() }, // 0
  { key: 'version', caption: 'Version', editor: et.text() },
  { key: 'icon', caption: 'Icon', editor: IconEditor }
];

const PluginAdmin = props => {
  return (
    <EditorPage
      title="CAD Plug-ins"
      icon="circus-app"
      searchName="admin-plugins"
      resource="admin/plugins"
      primaryKey="pluginId"
      editorProperties={editorProperties}
      listColumns={listColumns}
      makeEmptyItem={makeEmptyItem}
      targetName={item => `${item.pluginName} v${item.version}`}
    />
  );
};

export default PluginAdmin;
