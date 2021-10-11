import * as et from '@smikitky/rb-components/lib/editor-types';
import PropertyEditor, {
  PropertyEditorProperties
} from '@smikitky/rb-components/lib/PropertyEditor';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import { Button, Panel } from 'components/react-bootstrap';
import React, { useCallback, useEffect, useState } from 'react';
import { SearchPreset, UserPreferences } from 'store/loginUser';
import { useApi } from 'utils/api';
import { useUserPreferences } from 'utils/useLoginUser';
import useShowMessage from 'utils/useShowMessage';

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

const TemplateEditor: et.Editor<string[] | undefined> = props => {
  const { value = [], onChange } = props;
  const [newTemplate, setNewTemplate] = useState<string>('');
  const handleDeleteClick = (deleteMessage: string) => {
    const newValue = value.filter(message => message !== deleteMessage);
    onChange(newValue);
  };

  const handleAddClick = (addMessage: string) => {
    setNewTemplate('');
    if (
      value.some(message => {
        message === addMessage;
      })
    ) {
      return;
    }
    const newValue = value.concat(addMessage).sort();
    onChange(newValue);
  };

  const canNotAdd = () => {
    return (
      newTemplate.length < 1 || value.some(message => message === newTemplate)
    );
  };

  return (
    <>
      <label>New Template&nbsp; </label>
      <input
        type="text"
        value={newTemplate}
        onChange={ev => setNewTemplate(ev.target.value)}
      />
      &nbsp;
      <Button
        bsStyle="primary"
        disabled={canNotAdd()}
        onClick={() => handleAddClick(newTemplate)}
      >
        Add
      </Button>
      {!Array.isArray(value) || !value.length ? (
        <div className="form-control-static text-muted">(no templates)</div>
      ) : (
        <ul className="list-unstyled">
          {value.map(message => {
            return (
              <li key={message} className="form-control-static">
                {message}{' '}
                <IconButton
                  bsSize="xs"
                  bsStyle="primary"
                  icon="remove"
                  onClick={() => handleDeleteClick(message)}
                >
                  Delete
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
};

const appearanceProperties: PropertyEditorProperties<UserPreferences> = [
  {
    key: 'theme',
    caption: 'Color theme',
    editor: et.shrinkSelect({
      mode_white: 'White',
      mode_black: 'Black'
    }) as et.Editor<string | undefined>
  },
  {
    key: 'personalInfoView',
    caption: 'Show personal info',
    editor: et.checkbox({ label: 'show' }) as et.Editor<boolean | undefined>
  }
];

const searchProperties: PropertyEditorProperties<UserPreferences> = [
  {
    key: 'caseSearchPresets',
    caption: 'Case search presets',
    editor: PresetDeleteEditor
  },
  {
    key: 'seriesSearchPresets',
    caption: 'Series search presets',
    editor: PresetDeleteEditor
  },
  {
    key: 'pluginJobSearchPresets',
    caption: 'Plug-in job search presets',
    editor: PresetDeleteEditor
  }
];

const circusDBProperties: PropertyEditorProperties<UserPreferences> = [
  {
    key: 'referenceLine',
    caption: 'Reference lines',
    editor: et.checkbox({ label: 'show' }) as et.Editor<boolean | undefined>
  },
  {
    key: 'interpolationMode',
    caption: 'Interpolation mode',
    editor: et.shrinkSelect({
      nearestNeighbor: 'Nearest neighbor',
      trilinearFiltering: 'Trilinear filtering'
    }) as et.Editor<string | undefined>
  },
  {
    key: 'scrollBars',
    caption: 'Scroll bars',
    editor: et.shrinkSelect({
      none: 'None',
      small: 'Small',
      large: 'Large'
    }) as et.Editor<string | undefined>
  },
  {
    key: 'maintainAspectRatio',
    caption: 'Maintain aspect ratio',
    editor: et.checkbox({
      label: 'Always maintain aspect ratio (Shift + Drag to invert)'
    }) as et.Editor<boolean | undefined>
  },
  {
    key: 'fixCenterOfGravity',
    caption: 'Lock center of gravity',
    editor: et.checkbox({
      label: 'Always Lock center of gravity (Ctrl + Drag to invert)'
    }) as et.Editor<boolean | undefined>
  },
  {
    key: 'dimmedOutlineFor2DLabels',
    caption: '2D shapes visibility',
    editor: et.shrinkSelect({
      hide: 'No dimmed outline',
      show: '±2 slices',
      infinity: '±∞ slices'
    }) as et.Editor<string | undefined>
  },
  {
    key: 'revisionMessageTemplates',
    caption: 'Revision message templates',
    editor: TemplateEditor
  }
];

const Preferences: React.FC<{}> = props => {
  const api = useApi();
  const showMessage = useShowMessage();
  const [preferences, updatePreferences] = useUserPreferences();
  const [settings, setSettings] = useState<UserPreferences | null>(preferences);
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
      <Panel>
        <Panel.Heading>
          <Icon icon="glyphicon-adjust" /> Appearance
        </Panel.Heading>
        <Panel.Body>
          <PropertyEditor
            value={settings}
            properties={appearanceProperties}
            onChange={setSettings}
          />
        </Panel.Body>
      </Panel>
      <Panel>
        <Panel.Heading>
          <Icon icon="search" /> Search
        </Panel.Heading>
        <Panel.Body>
          <PropertyEditor
            value={settings}
            properties={searchProperties}
            onChange={setSettings}
          />
        </Panel.Body>
      </Panel>
      <Panel>
        <Panel.Heading>
          <Icon icon="circus-case" /> CIRCUS DB
        </Panel.Heading>
        <Panel.Body>
          <PropertyEditor
            value={settings}
            properties={circusDBProperties}
            onChange={setSettings}
          />
        </Panel.Body>
      </Panel>
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
