import EditorPage from './EditorPage';
import React, { Fragment } from 'react';
import BodyPartIcon, { CircusIconDefinition } from 'components/BodyPartIcon';
import IconEditor from './IconEditor';
import JsonEditor from './JsonEditor';
import * as et from '@smikitky/rb-components/lib/editor-types';
import PropertyEditor, {
  PropertyEditorProperties
} from '@smikitky/rb-components/lib/PropertyEditor';
import { DataGridColumnDefinition } from 'components/DataGrid';

const makeEmptyItem = () => {
  return {
    pluginName: 'new plug-in',
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

const listColumns: DataGridColumnDefinition[] = [
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

interface RunConfiguration {
  gpus: string;
  timeout: number;
}

const runConfigurationProperties: PropertyEditorProperties<RunConfiguration> = [
  { key: 'gpus', caption: 'GPUs', editor: et.text() },
  { key: 'timeout', caption: 'Timeout (sec)', editor: et.number({ min: 0 }) }
];

const RunConfigurationEditor: et.Editor<RunConfiguration> = props => {
  const { value, onChange } = props;
  return (
    <PropertyEditor
      properties={runConfigurationProperties}
      value={value}
      onChange={onChange}
    />
  );
};

interface PluginEditorProperties {
  pluginName: string;
  version: string;
  icon: CircusIconDefinition;
  runConfiguration: RunConfiguration;
  displayStrategy: any;
}

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
] as PropertyEditorProperties<PluginEditorProperties>;

const PluginAdmin: React.FC<{}> = props => {
  return (
    <EditorPage
      title="CAD Plug-ins"
      icon="circus-app"
      searchName="admin-plugins"
      resource={{ endPoint: 'admin/plugins', primaryKey: 'pluginId' }}
      editorProperties={editorProperties}
      listColumns={listColumns}
      makeEmptyItem={makeEmptyItem}
      targetName={item => `${item.pluginName} v${item.version}`}
    />
  );
};

export default PluginAdmin;
