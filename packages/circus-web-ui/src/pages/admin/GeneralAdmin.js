import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from 'utils/api';
import { showMessage } from 'actions';
import { Button } from 'components/react-bootstrap';
import AdminContainer from './AdminContainer';
import PropertyEditor from 'rb/PropertyEditor';
import * as et from 'rb/editor-types';
import ShrinkSelect from 'rb/ShrinkSelect';

const GeneralAdmin = props => {
  const [settings, setSettings] = useState(null);
  const [complaints, setComplaints] = useState({});
  const api = useApi();

  const arrayOfStringsEditor = useMemo(
    () => et.arrayOf(et.text({ style: { width: '200px', display: 'inline' } })),
    []
  );

  const domainSelector = useMemo(
    () => props => <ShrinkSelect options={settings.domains} {...props} />,
    [settings && settings.domains]
  );

  const loadSettings = async () => {
    const data = await api('admin/server-params');
    setSettings(data);
    setComplaints({});
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const propertyChange = value => {
    if (value.domains.indexOf(value.defaultDomain) === -1) {
      value.defaultDomain = '';
    }
    if (value.defaultDomain === '' && value.domains.length > 0) {
      value.defaultDomain = value.domains[0];
    }
    setSettings(value);
  };

  const saveClick = async () => {
    const newSettings = {
      ...settings,
      domains: settings.domains
        .map(d => (typeof d === 'string' ? d.trim() : ''))
        .filter(d => typeof d === 'string' && d.length > 0)
    };
    setSettings(newSettings);
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
      loadSettings();
    } catch (err) {
      setComplaints(err.data.errors);
    }
  };

  if (settings === null) return null;

  const properties = [
    {
      caption: 'Domains',
      key: 'domains',
      editor: arrayOfStringsEditor
    },
    {
      caption: 'Default Domain',
      key: 'defaultDomain',
      editor: domainSelector
    }
  ];

  return (
    <AdminContainer title="General Server Configuration" icon="th-large">
      <PropertyEditor
        value={settings}
        complaints={complaints}
        properties={properties}
        onChange={propertyChange}
      />
      <p className="text-center">
        <Button bsStyle="primary" onClick={saveClick}>
          Save
        </Button>
        <Button bsStyle="link" onClick={loadSettings}>
          Cancel
        </Button>
      </p>
    </AdminContainer>
  );
};

export default GeneralAdmin;
