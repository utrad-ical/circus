import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApi } from 'utils/api';
import useShowMessage from 'utils/useShowMessage';
import { Button } from 'components/react-bootstrap';
import AdminContainer from './AdminContainer';
import PropertyEditor, {
  PropertyEditorProperties
} from '@smikitky/rb-components/lib/PropertyEditor';
import * as et from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';

interface Settings {
  domains: string[];
  defaultDomain: string;
}

const arrayOfStringsEditor = et.arrayOf(
  et.text({ style: { width: '200px', display: 'inline' } }),
  ''
);

const GeneralAdmin: React.FC<{}> = props => {
  const [settings, setSettings] = useState<Settings>({
    domains: [],
    defaultDomain: ''
  });
  const [complaints, setComplaints] = useState({});
  const api = useApi();
  const showMessage = useShowMessage();

  const loadSettings = useCallback(async () => {
    const data = (await api('admin/server-params')) as Settings;
    setSettings(data);
    setComplaints({});
  }, [api]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handlePropertyChange = (value: Settings) => {
    if (value.domains.indexOf(value.defaultDomain) === -1) {
      value.defaultDomain = '';
    }
    if (value.defaultDomain === '' && value.domains.length > 0) {
      value.defaultDomain = value.domains[0];
    }
    setSettings(value);
  };

  const handleSaveClick = async () => {
    const newSettings: Settings = {
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

  const properties = useMemo(
    () =>
      [
        {
          caption: 'Domains',
          key: 'domains',
          editor: arrayOfStringsEditor
        },
        {
          caption: 'Default Domain',
          key: 'defaultDomain',
          editor: (props: any) => (
            <ShrinkSelect options={settings.domains} {...props} />
          )
        }
      ] as PropertyEditorProperties<Settings>,
    [settings.domains]
  );

  if (settings === null) return null;

  return (
    <AdminContainer title="General Server Configuration" icon="th-large">
      <PropertyEditor
        value={settings}
        complaints={complaints}
        properties={properties}
        onChange={handlePropertyChange}
      />
      <p className="text-center">
        <Button bsStyle="primary" onClick={handleSaveClick}>
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
