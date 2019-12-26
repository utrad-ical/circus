import React, { useState, useEffect, useCallback } from 'react';
import PropertyEditor from 'rb/PropertyEditor';
import * as et from 'rb/editor-types';
import { useApi } from 'utils/api';
import { useLoginManager } from 'utils/loginManager';
import { showMessage } from 'actions';
import { Button } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import Icon from 'components/Icon';

const PresetDeleteEditor = props => {
  const { value, onChange } = props;

  const handleDeleteClick = presetName => {
    const newValue = value.filter(preset => preset.name !== presetName);
    onChange(newValue);
  };

  if (!Array.isArray(value) || !value.length) {
    return <div className="form-control-static text-muted">(no presets)</div>;
  }

  return (
    <ul className="list-unstyled">
      {value.map(preset => {
        return (
          <li key={preset.name} className="form-control-static">
            {preset.name}{' '}
            <IconButton
              bsSize="xs"
              bsStyle="primary"
              icon="remove"
              onClick={() => handleDeleteClick(preset.name)}
            >
              Delete
            </IconButton>
          </li>
        );
      })}
    </ul>
  );
};

const Preferences = props => {
  const [settings, setSettings] = useState(null);
  const loginManager = useLoginManager();
  const api = useApi();

  const loadSettings = useCallback(async () => {
    const settings = await api('preferences');
    setSettings(settings);
  }, [api]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveClick = async () => {
    await api('preferences', {
      method: 'patch',
      data: settings
    });
    showMessage('Your preference was saved.', 'success', { short: true });
    loadSettings();
    loginManager.refreshUserInfo(true);
  };

  if (settings === null) return <div />;

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
    },
    {
      caption: 'Case Search Presets',
      key: 'caseSearchPresets',
      editor: PresetDeleteEditor
    },
    {
      caption: 'Series Search Presets',
      key: 'seriesSearchPresets',
      editor: PresetDeleteEditor
    }
  ];

  return (
    <div>
      <h1>
        <Icon icon="circus-preference" /> Preferences
      </h1>
      <PropertyEditor
        value={settings}
        properties={properties}
        onChange={setSettings}
      />
      <p className="text-center">
        <Button bsStyle="primary" onClick={saveClick}>
          Save
        </Button>
        <Button bsStyle="link" onClick={loadSettings}>
          Cancel
        </Button>
      </p>
    </div>
  );
};

export default Preferences;
