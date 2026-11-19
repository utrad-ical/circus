import EditorPage from './EditorPage.tsx';
import React, { type FC } from 'react';
import type { Plugin } from '@utrad-ical/circus-api-schema';
import BodyPartIcon from '#components/BodyPartIcon.tsx';
import IconEditor from './IconEditor.tsx';
import CopyToClipboardButton from '#components/CopyToClipboardButton.tsx';
import JsonEditor from './JsonEditor.tsx';
import * as et from '#components/editorTypes.tsx';
import type { PropertyEditorProperties } from '#components/PropertyEditor.tsx';
import PropertyEditor from '#components/PropertyEditor.tsx';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';

const listColumns: DataGridColumnDefinition<Plugin>[] = [
  {
    key: 'pluginId',
    caption: 'Plug-in ID',
    renderer: ({ value: plugin }) => (
      <span title={plugin.pluginId}>
        {plugin.pluginId.substring(0, 12)}
        {/* Prevents the row click from opening the editor */}
        <span onClick={ev => ev.stopPropagation()}>
          <CopyToClipboardButton size="xsmall" string={plugin.pluginId} />
        </span>
      </span>
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

type RunConfiguration = Plugin['runConfiguration'];

const runConfigurationProperties: PropertyEditorProperties<RunConfiguration> = [
  {
    key: 'gpus',
    caption: 'GPUs',
    editor: et.text() as et.Editor<RunConfiguration['gpus']>
  },
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

// The ID and the type cannot be changed
const editorProperties: PropertyEditorProperties<Plugin> = [
  { key: 'pluginName', caption: 'Plug-in Name', editor: et.text() },
  { key: 'version', caption: 'Version', editor: et.text() },
  { key: 'icon', caption: 'Icon', editor: IconEditor },
  {
    key: 'runConfiguration',
    caption: 'Run Configuration',
    editor: RunConfigurationEditor
  },
  { key: 'displayStrategy', caption: 'Display Strategy', editor: JsonEditor }
];

// Plug-ins are registered with the CLI (`circus plugin register`)
const PluginAdmin: FC<{}> = props => {
  return (
    <EditorPage
      title="CAD Plug-ins"
      icon="circus-app"
      searchName="admin-plugins-cad"
      resource={{ endPoint: 'admin/plugins', primaryKey: 'pluginId' }}
      editorProperties={editorProperties}
      listColumns={listColumns}
      makeEmptyItem={() => ({})}
      targetName={item => `${item.pluginName} v${item.version}`}
      enableNewItem={false}
    />
  );
};

export default PluginAdmin;
