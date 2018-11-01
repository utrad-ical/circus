import EditorPage from './EditorPage';
import React from 'react';
// import { api } from 'utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';
import BodyPartIcon from 'components/BodyPartIcon';
import IconEditor from './IconEditor';
import * as et from 'rb/editor-types';

const makeEmptyItem = () => {
  return {
    pluginName: 'new plugin',
    pluginVersion: '1.0.1',
    icon: {
      glyph: 'b-calc',
      color: '#ffffff',
      backgroundColor: '#555555'
    }
  };
};

const listColumns = [
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
  { key: 'pluginVersion', caption: 'Plug-in Version' }
];

const editorProperties = [
  { key: 'pluginName', caption: 'Plug-in Name', editor: et.text() }, // 0
  { key: 'icon', caption: 'Icon', editor: IconEditor }
];

export default class PluginAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ready: false };
  }

  async componentDidMount() {
    this.setState({ ready: true });
  }

  render() {
    if (!this.state.ready) return <LoadingIndicator />;
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
        targetName={item => `${item.pluginName} v${item.pluginVersion}`}
      />
    );
  }
}
