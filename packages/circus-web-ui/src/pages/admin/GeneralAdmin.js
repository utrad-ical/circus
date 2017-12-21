import React from 'react';
import { api } from 'utils/api';
import { showMessage } from 'actions';
import { Button } from 'components/react-bootstrap';
import AdminContainer from './AdminContainer';
import PropertyEditor from 'rb/PropertyEditor';
import * as et from 'rb/editor-types';
import ShrinkSelect from 'rb/ShrinkSelect';

export default class GeneralAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = { settings: null, complaints: {} };
    this.arrayOfStringsEditor = et.arrayOf(
      et.text({ style: { width: '200px', display: 'inline' } })
    );
    this.domainSelector = props => (
      <ShrinkSelect options={this.state.settings.domains} {...props} />
    );
  }

  async loadSettings() {
    const settings = await api('admin/server-params');
    this.setState({ settings, complaints: {} });
  }

  componentDidMount() {
    this.loadSettings();
  }

  propertyChange(value) {
    if (value.domains.indexOf(value.defaultDomain) === -1) {
      value.defaultDomain = '';
    }
    if (value.defaultDomain === '' && value.domains.length > 0) {
      value.defaultDomain = value.domains[0];
    }
    this.setState({ settings: value });
  }

  async saveClick() {
    const newSettings = {
      ...this.state.settings,
      domains: this.state.settings.domains
        .map(d => (typeof d === 'string' ? d.trim() : ''))
        .filter(d => typeof d === 'string' && d.length > 0)
    };
    this.setState({ settings: newSettings });
    try {
      await api('admin/server-params', {
        method: 'put',
        data: newSettings,
        handleErrors: [400]
      });
      showMessage('Settings saved.', 'success', {
        tag: 'general-admin',
        short: true
      });
      this.loadSettings();
    } catch (err) {
      this.setState({ complaints: err.data.errors });
    }
  }

  render() {
    if (this.state.settings === null) return <div />;

    const properties = [
      {
        caption: 'Domains',
        key: 'domains',
        editor: this.arrayOfStringsEditor
      },
      {
        caption: 'Default Domain',
        key: 'defaultDomain',
        editor: this.domainSelector
      }
    ];

    return (
      <AdminContainer title="General Server Configuration" icon="tasks">
        <PropertyEditor
          value={this.state.settings}
          complaints={this.state.complaints}
          properties={properties}
          onChange={this.propertyChange.bind(this)}
        />
        <p className="text-center">
          <Button bsStyle="primary" onClick={() => this.saveClick()}>
            Save
          </Button>
          <Button bsStyle="link" onClick={() => this.loadSettings()}>
            Cancel
          </Button>
        </p>
      </AdminContainer>
    );
  }
}
