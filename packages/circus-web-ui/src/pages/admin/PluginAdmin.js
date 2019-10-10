import EditorPage from './EditorPage';
import React, { Fragment } from 'react';
import BodyPartIcon from 'components/BodyPartIcon';
import IconEditor from './IconEditor';
import JsonEditor from './JsonEditor';
import * as et from 'rb/editor-types';
import PropertyEditor from '@smikitky/rb-components/lib/PropertyEditor';

const makeEmptyItem = () => {
  return {
    pluginName: 'new plugin',
    pluginVersion: '1.0.1',
    icon: {
      glyph: 'calc',
      color: '#ffffff',
      backgroundColor: '#555555'
    },
    runConfiguratin: {
      timeout: 0,
      gpus: ''
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

const runConfigurationProperties = [
  { key: 'gpus', caption: 'GPUs', editor: et.text() },
  { key: 'timeout', caption: 'Timeout (sec)', editor: et.number({ min: 0 }) }
];

const RunConfigurationEditor = props => {
  const { value, onChange } = props;
  return (
    <PropertyEditor
      properties={runConfigurationProperties}
      value={value}
      onChange={onChange}
    />
  );
};

const editorProperties = [
  { key: 'pluginName', caption: 'Plug-in Name', editor: et.text() },
  { key: 'version', caption: 'Version', editor: et.text() },
  { key: 'icon', caption: 'Icon', editor: IconEditor },
  {
    key: 'runConfiguration',
    caption: 'Run Configuration',
    editor: RunConfigurationEditor
  },
  { key: 'displayStrategy', caption: 'Display Stratgy', editor: JsonEditor }
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
