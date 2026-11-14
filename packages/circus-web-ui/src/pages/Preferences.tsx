import u from '#components/utilities.module.css';
import Input from '#components/Input.tsx';
import Panel, { PanelHeader, PanelBody } from '#components/Panel.tsx';
import { selectEditor } from '#components/Select.tsx';
import Button from '#components/Button.tsx';
import * as et from '#components/editorTypes.tsx';
import type { PropertyEditorProperties } from '#components/PropertyEditor.tsx';
import PropertyEditor from '#components/PropertyEditor.tsx';
import Icon from '#components/Icon.tsx';
import LabelColorsEditor from '#components/LabelColorsEditor.tsx';
import { labeledSlider } from '#components/LabeledSlider.tsx';
import React, { useCallback, useEffect, useState } from 'react';
import type { SearchPreset, UserPreferences } from '#store/loginUser.ts';
import { api } from '#utils/api.ts';
import { useUserPreferences } from '#utils/useLoginUser.ts';
import useShowMessage from '#utils/useShowMessage.ts';
import type { WindowPropagationScope } from '../store/loginUser.ts';
import ScrollbarEditor from './ScrollBarsEditor.tsx';

const PresetDeleteEditor: et.Editor<SearchPreset[] | undefined> = props => {
  const { value = [], onChange } = props;

  const handleDeleteClick = (presetName: string) => {
    const newValue = value.filter(preset => preset.name !== presetName);
    onChange(newValue);
  };

  if (!Array.isArray(value) || !value.length) {
    return <div className={u.muted}>(no presets)</div>;
  }

  return (
    <ul className={u.plainList}>
      {value.map(preset => {
        return (
          <li key={preset.name}>
            {preset.name}{' '}
            <Button
              size="xsmall"
              variant="primary"
              icon="material-close"
              onClick={() => handleDeleteClick(preset.name)}
            >
              Delete
            </Button>
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
      <span
        className="revision-message-template"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}
      >
        <label style={{ whiteSpace: 'nowrap' }}>New Template</label>
        <Input
          type="text"
          autoFocus
          value={newTemplate}
          onChange={(ev: any) => setNewTemplate(ev.target.value)}
        />
        <Button
          variant="primary"
          disabled={canNotAdd()}
          onClick={() => handleAddClick(newTemplate)}
        >
          Add
        </Button>
      </span>
      {!Array.isArray(value) || !value.length ? (
        <div className={u.muted}>(no templates)</div>
      ) : (
        <ul className={u.plainList}>
          {value.map(message => {
            return (
              <li key={message}>
                {message}{' '}
                <Button
                  size="xsmall"
                  variant="primary"
                  icon="material-close"
                  onClick={() => handleDeleteClick(message)}
                >
                  Delete
                </Button>
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
    editor: selectEditor({
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
    key: 'initailAlphaForNewLabels',
    caption: 'Initial alpha for new labels',
    editor: labeledSlider({
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 1,
      label: value => `${Math.round(value * 100)}%`
    })
  },
  {
    key: 'labelColors',
    caption: 'Label colors',
    editor: LabelColorsEditor
  },
  {
    key: 'interpolationMode',
    caption: 'Interpolation mode',
    editor: selectEditor({
      nearestNeighbor: 'Nearest neighbor',
      trilinearFiltering: 'Trilinear filtering'
    }) as et.Editor<string | undefined>
  },
  {
    key: 'windowPropagationScope',
    caption: 'Window propagation scope',
    editor: selectEditor({
      all: 'All',
      series: 'Per series',
      viewer: 'Per viewer'
    }) as et.Editor<WindowPropagationScope | undefined>
  },
  {
    key: 'scrollBarsInfo',
    caption: 'Scroll bars',
    editor: ScrollbarEditor
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
    editor: selectEditor({
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
  const showMessage = useShowMessage();
  const [preferences, updatePreferences] = useUserPreferences();
  const [settings, setSettings] = useState<UserPreferences | null>(preferences);
  const loadSettings = useCallback(async (isMounted: boolean) => {
    const settings = await api('preferences');
    if (!isMounted) return;
    setSettings(settings);
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadSettings(isMounted);
    return () => {
      isMounted = false;
    };
  }, [loadSettings]);

  const saveClick = async () => {
    await updatePreferences(settings!);
    showMessage('Your preference was saved.', 'success', { short: true });
    loadSettings(true);
  };

  if (settings === null) return <div />;

  return (
    <div>
      <h1>
        <Icon icon="circus-preference" /> Preferences
      </h1>
      <Panel>
        <PanelHeader>
          <Icon icon="material-contrast" /> Appearance
        </PanelHeader>
        <PanelBody>
          <PropertyEditor
            value={settings}
            properties={appearanceProperties}
            onChange={setSettings}
          />
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader>
          <Icon icon="material-search" /> Search
        </PanelHeader>
        <PanelBody>
          <PropertyEditor
            value={settings}
            properties={searchProperties}
            onChange={setSettings}
          />
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader>
          <Icon icon="circus-case" /> CIRCUS DB
        </PanelHeader>
        <PanelBody>
          <PropertyEditor
            value={settings}
            properties={circusDBProperties}
            onChange={setSettings}
          />
        </PanelBody>
      </Panel>
      <p className={u.textCenter}>
        <Button variant="primary" onClick={saveClick}>
          Save
        </Button>
        <Button variant="link" onClick={() => loadSettings(true)}>
          Reset
        </Button>
      </p>
    </div>
  );
};

export default Preferences;
