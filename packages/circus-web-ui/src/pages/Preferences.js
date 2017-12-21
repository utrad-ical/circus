import React from 'react';
import PropertyEditor from 'rb/PropertyEditor';
import * as et from 'rb/editor-types';
import { api } from 'utils/api';
import { showMessage } from 'actions';
import { Button } from 'components/react-bootstrap';

export default class Preferences extends React.Component {
  constructor(props) {
    super(props);
    this.saveClick = this.saveClick.bind(this);
    this.loadSettings = this.loadSettings.bind(this);
    this.state = { settings: null };
  }

  async loadSettings() {
    const settings = await api('preferences');
    this.setState({ settings });
  }

  componentDidMount() {
    this.loadSettings();
  }

  propertyChange(value) {
    this.setState({ settings: value });
  }

  async saveClick() {
    await api('preferences', {
      method: 'put',
      data: this.state.settings
    });
    showMessage('Your preference was saved.', 'success', { short: true });
    this.loadSettings();
  }

  render() {
    if (this.state.settings === null) return <div />;

    const properties = [
      {
        caption: 'Color Theme',
        key: 'theme',
        editor: et.shrinkSelect({ mode_white: 'White', mode_black: 'Black' })
      },
      {
        caption: 'Show Personal Info',
        key: 'personalInfoView',
        editor: et.checkbox({ label: 'show' })
      }
    ];

    return (
      <div>
        <h1>
          <span className="circus-icon circus-icon-preference" />&ensp;
          Preferences
        </h1>
        <PropertyEditor
          value={this.state.settings}
          properties={properties}
          onChange={this.propertyChange.bind(this)}
        />
        <p className="text-center">
          <Button bsStyle="primary" onClick={this.saveClick}>
            Save
          </Button>
          <Button bsStyle="link" onClick={this.loadSettings}>
            Cancel
          </Button>
        </p>
      </div>
    );
  }
}
