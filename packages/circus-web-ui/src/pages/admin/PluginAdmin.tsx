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

type PluginType = 'CAD' | 'CAD+remote';

const makeEmptyItem = (type: PluginType) => ({
  pluginName: 'new plug-in',
  version: '1.0.1',
  icon: { glyph: 'calc', color: '#ffffff', backgroundColor: '#555555' },
  type,
  description: '',
  runConfiguration:
    type === 'CAD'
      ? { timeout: 0, gpus: '' }
      : {
          adapter: '',
          parameters: {
            endpoint: '',
            authentication: '',
            maxConcurrency: 1,
            env: []
          }
        },
  displayStrategy: []
});

const listColumns: Record<PluginType, DataGridColumnDefinition[]> = {
  CAD: [
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
  ],
  'CAD+remote': [
    {
      key: 'adapter',
      caption: 'Adapter',
      renderer: ({ value: plugin }) => <Fragment>{plugin.adapter}</Fragment>
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
  ]
};

interface RunConfiguration {
  gpus: string;
  timeout: number;
}

interface RemoteRunConfiguration {
  adapter: string;
  parameters: Parameters;
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

interface Parameters {
  endpoint: string;
  authentication: string;
  maxConcurrency: number;
  env: Record<string, string>;
}

const parametersProperties: PropertyEditorProperties<Parameters> = [
  { key: 'endpoint', caption: 'Endpoint', editor: et.text() },
  { key: 'authentication', caption: 'Authentication', editor: et.text() },
  { key: 'maxConcurrency', caption: 'Max Concurrency', editor: et.number() },
  { key: 'env', caption: 'Environment Variables', editor: JsonEditor }
];

const ParametersEditor: et.Editor<Parameters> = props => {
  const { value, onChange } = props;
  return (
    <PropertyEditor
      properties={parametersProperties}
      value={value}
      onChange={onChange}
    />
  );
};

const RemoteRunConfigurationEditor: et.Editor<
  RemoteRunConfiguration
> = props => {
  const { value, onChange } = props;
  return (
    <PropertyEditor
      properties={[
        { key: 'adapter', caption: 'Adapter', editor: et.text() },
        {
          key: 'parameters',
          caption: 'Parameters',
          editor: ParametersEditor
        }
      ]}
      value={value}
      onChange={onChange}
    />
  );
};

interface CadPluginEditorProperties {
  type: PluginType;
  pluginName: string;
  version: string;
  icon: CircusIconDefinition;
  runConfiguration: RunConfiguration;
  displayStrategy: any;
}

interface CadRemotePluginEditorProperties {
  type: PluginType;
  pluginName: string;
  version: string;
  icon: CircusIconDefinition;
  description: string;
  runConfiguration: RemoteRunConfiguration;
  displayStrategy: any;
}

const editorProperties: {
  CAD: PropertyEditorProperties<CadPluginEditorProperties>;
  'CAD+remote': PropertyEditorProperties<CadRemotePluginEditorProperties>;
} = {
  CAD: [
    {
      key: 'type',
      caption: 'Plug-in Type',
      editor: props => <>CAD</>
    },
    { key: 'pluginName', caption: 'Plug-in Name', editor: et.text() },
    { key: 'version', caption: 'Version', editor: et.text() },
    { key: 'icon', caption: 'Icon', editor: IconEditor },
    {
      key: 'runConfiguration',
      caption: 'Run Configuration',
      editor: RunConfigurationEditor
    },
    { key: 'displayStrategy', caption: 'Display Stratgy', editor: JsonEditor }
  ],
  'CAD+remote': [
    {
      key: 'type',
      caption: 'Plug-in Type',
      editor: props => <>CAD+remote</>
    },
    { key: 'pluginName', caption: 'Plug-in Name', editor: et.text() },
    { key: 'version', caption: 'Version', editor: et.text() },
    { key: 'icon', caption: 'Icon', editor: IconEditor },
    { key: 'description', caption: 'Description', editor: et.text() },
    {
      key: 'runConfiguration',
      caption: 'Run Configuration',
      editor: RemoteRunConfigurationEditor
    },
    { key: 'displayStrategy', caption: 'Display Stratgy', editor: JsonEditor }
  ]
};

const PluginEditorPage: React.FC<{
  type: PluginType;
  enableNewItem?: boolean;
}> = ({ type, enableNewItem }) => {
  return (
    <EditorPage
      title={`${type} Plug-ins`}
      icon="circus-app"
      searchName={`admin-plugins-${type.toLowerCase()}`}
      resource={{ endPoint: 'admin/plugins', primaryKey: 'pluginId' }}
      editorProperties={editorProperties[type]}
      listColumns={listColumns[type]}
      makeEmptyItem={() => makeEmptyItem(type)}
      targetName={item => `${item.pluginName} v${item.version}`}
      filter={{ type }}
      enableNewItem={enableNewItem}
    />
  );
};

const PluginAdmin: React.FC<{}> = props => {
  return (
    <>
      <PluginEditorPage type="CAD" enableNewItem={false} />
      <PluginEditorPage type="CAD+remote" />
    </>
  );
};

export default PluginAdmin;
