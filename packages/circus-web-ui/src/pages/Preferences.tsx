import React, { useState, useEffect, useCallback } from 'react';
import PropertyEditor, {
  PropertyEditorProperties
} from '@smikitky/rb-components/lib/PropertyEditor';
import * as et from '@smikitky/rb-components/lib/editor-types';
import { useApi } from 'utils/api';
import { Button } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import Icon from 'components/Icon';
import { SearchPreset, UserPreferences } from 'store/loginUser';
import useShowMessage from 'utils/useShowMessage';
import { useUserPreferences } from 'utils/useLoginUser';

const PresetDeleteEditor: et.Editor<SearchPreset[] | undefined> = props => {
  const { value = [], onChange } = props;

  const handleDeleteClick = (presetName: string) => {
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

const appearanceProperties: PropertyEditorProperties<UserPreferences> = [
  {
    key: 'theme',
    caption: 'Color Theme',
    editor: et.shrinkSelect({
      mode_white: 'White',
      mode_black: 'Black'
    }) as et.Editor<string | undefined>
  },
  {
    key: 'personalInfoView',
    caption: 'Show Personal Info',
    editor: et.checkbox({ label: 'show' }) as et.Editor<boolean | undefined>
  }
];

const searchProperties: PropertyEditorProperties<UserPreferences> = [
  {
    key: 'caseSearchPresets',
    caption: 'Case Search Presets',
    editor: PresetDeleteEditor
  },
  {
    key: 'seriesSearchPresets',
    caption: 'Series Search Presets',
    editor: PresetDeleteEditor
  },
  {
    key: 'pluginJobSearchPresets',
    caption: 'Plug-in Job Search Presets',
    editor: PresetDeleteEditor
  }
];

const viewerProperties: PropertyEditorProperties<UserPreferences> = [
  {
    key: 'referenceLine',
    caption: 'Reference Line',
    editor: et.checkbox({ label: 'show' }) as et.Editor<boolean | undefined>
  },
  {
    key: 'interpolationMode',
    caption: 'Interpolation Mode',
    editor: et.shrinkSelect({
      none: 'None',
      trilinearFiltering: 'Trilinear filtering'
    }) as et.Editor<string | undefined>
  },
  {
    key: 'maintainAspectRatio',
    caption: 'Shift + Drag to maintain aspect ratio',
    editor: et.checkbox({
      label: 'lock'
    }) as et.Editor<boolean | undefined>
  },
  {
    key: 'fixCenterOfGravity',
    caption: 'Ctrl + Drag to fix center of gravity',
    editor: et.checkbox({
      label: 'lock'
    }) as et.Editor<boolean | undefined>
  },
  {
    key: 'sliceNumberFor2DShape',
    caption: 'Number of Slices for 2D Shape',
    editor: et.shrinkSelect({
      '0': 'None',
      '3': '± 2',
      Infinity: '∞'
    }) as et.Editor<string | undefined>
  }
];

const Preferences: React.FC<{}> = props => {
  const api = useApi();
  const showMessage = useShowMessage();
  const [preferences, updatePreferences] = useUserPreferences();
  const [settings, setSettings] = useState<UserPreferences | null>(preferences);
  console.log(settings);
  const loadSettings = useCallback(async () => {
    const settings = await api('preferences');
    setSettings(settings);
  }, [api]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveClick = async () => {
    await updatePreferences(settings!);
    showMessage('Your preference was saved.', 'success', { short: true });
    loadSettings();
  };

  if (settings === null) return <div />;

  return (
    <div>
      <h1>
        <Icon icon="circus-preference" /> Preferences
      </h1>
      <h2>Appearance</h2>
      <PropertyEditor
        value={settings}
        properties={appearanceProperties}
        onChange={setSettings}
      />
      <h2>Search</h2>
      <PropertyEditor
        value={settings}
        properties={searchProperties}
        onChange={setSettings}
      />
      <h2>DICOM DB</h2>
      <PropertyEditor
        value={settings}
        properties={viewerProperties}
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
