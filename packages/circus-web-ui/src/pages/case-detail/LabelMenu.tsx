import { ColorPalette } from '@smikitky/rb-components/lib/ColorPicker';
import { confirm, prompt } from '@smikitky/rb-components/lib/modal';
import Slider from '@smikitky/rb-components/lib/Slider';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import { Composition, Viewer } from '@utrad-ical/circus-rs/src/browser';
import focusBy from '@utrad-ical/circus-rs/src/browser/tool/state/focusBy';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import {
  Button,
  MenuItem,
  OverlayTrigger,
  Popover,
  SplitButton
} from 'components/react-bootstrap';
import produce from 'immer';
import React from 'react';
import styled from 'styled-components';
import tinyColor from 'tinycolor2';
import useLocalPreference from 'utils/useLocalPreference';
import {
  createNewLabelData,
  EditingData,
  EditingDataUpdater,
  getCenterOfLabel,
  InternalLabel,
  LabelAppearance,
  LabelType,
  labelTypes
} from './revisionData';

type LabelCommand = 'rename' | 'remove' | 'convertType' | 'reveal';

const LabelMenu: React.FC<{
  editingData: EditingData;
  composition: Composition;
  updateEditingData: EditingDataUpdater;
  viewers: { [index: string]: Viewer };
  disabled?: boolean;
}> = props => {
  const {
    editingData,
    composition,
    updateEditingData,
    viewers,
    disabled
  } = props;

  const [newLabelType, setNewLabelType] = useLocalPreference<LabelType>(
    'newLabelType',
    'voxel'
  );

  const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];
  const activeLabel =
    activeLabelIndex >= 0 ? activeSeries.labels[activeLabelIndex] : null;

  const updateCurrentLabels = (updater: (laels: InternalLabel[]) => void) => {
    // Small wrapper around updateEditingData
    const labels = editingData.revision.series[activeSeriesIndex].labels;
    const newLabels = produce(labels, updater);
    updateEditingData(editingData => {
      editingData.revision.series[activeSeriesIndex].labels = newLabels;
    });
  };

  const handleCommand = async (command: LabelCommand) => {
    if (disabled) return;
    switch (command) {
      case 'rename': {
        if (!activeLabel) return;
        const newName = await prompt('Label name', activeLabel.name || '');
        if (newName === null || activeLabel.name === newName) return;
        updateCurrentLabels(labels => {
          labels[activeLabelIndex].name = newName;
        });
        break;
      }
      case 'remove': {
        if (!(await confirm('Delete this label?'))) return;
        updateEditingData(editingData => {
          const series = editingData.revision.series[activeSeriesIndex];
          series.labels.splice(activeLabelIndex, 1);
          if (series.labels.length === 0) {
            editingData.activeLabelIndex = -1;
          } else if (activeLabelIndex >= series.labels.length) {
            editingData.activeLabelIndex = series.labels.length - 1;
          }
        });
        break;
      }
      case 'convertType': {
        if (!activeLabel) return;
        const newLabelType = labelTypes[activeLabel.type].canConvertTo;
        if (!newLabelType) return;
        updateCurrentLabels(labels => {
          labels[activeLabelIndex].type = newLabelType;
        });
        break;
      }
      case 'reveal': {
        if (!activeLabel) return;
        const center = getCenterOfLabel(composition, activeLabel);
        Object.values(viewers).forEach(viewer => focusBy(viewer, center));
      }
    }
  };

  const handleAppearanceChange = (
    appearance: LabelAppearance,
    hidden: boolean
  ) => {
    updateEditingData(editingData => {
      const label =
        editingData.revision.series[activeSeriesIndex].labels[activeLabelIndex];
      if (label.data.color !== appearance.color)
        label.data.color = appearance.color;
      if (label.data.alpha !== appearance.alpha)
        label.data.alpha = appearance.alpha;
      if (label.hidden !== hidden) label.hidden = hidden;
    }, 'Change appearance');
  };

  const getUniqueLabelName = (name: string) => {
    const nameExists = (name: string) =>
      activeSeries.labels.some(label => label.name === name);
    if (!nameExists(name)) return name;
    for (let index = 2; ; index++) {
      const newName = name + ' ' + index;
      if (!nameExists(newName)) return newName;
    }
  };

  const createNewLabel = (type: LabelType): InternalLabel => {
    const color = '#ff0000';
    const alpha = 1;
    const temporaryKey = generateUniqueId();
    const labelNames: { [key in LabelType]: string } = {
      voxel: 'Voxels',
      ellipsoid: '3D Shape',
      cuboid: '3D Shape',
      ellipse: '2D Shape',
      rectangle: '2D Shape'
    };
    const name = getUniqueLabelName(labelNames[type]);
    const data = createNewLabelData(type, { color, alpha }, viewers);
    return { temporaryKey, name, ...data, attributes: {}, hidden: false };
  };

  const addLabel = (type: LabelType) => {
    setNewLabelType(type);
    const newLabel = createNewLabel(type);
    updateCurrentLabels(labels => {
      labels.push(newLabel);
    });
  };

  return (
    <StyledButtonsDiv>
      <AppearanceEditor
        appearance={
          activeLabel
            ? {
                color: activeLabel.data.color,
                alpha: activeLabel.data.alpha
              }
            : undefined
        }
        hidden={!!activeLabel?.hidden}
        disabled={!activeLabel || disabled}
        onChange={handleAppearanceChange}
      />
      <div className="spacer" />
      {activeLabel && labelTypes[activeLabel.type].canConvertTo && (
        <IconButton
          bsSize="xs"
          title={'Convert to ' + labelTypes[activeLabel.type].canConvertTo}
          icon={labelTypes[labelTypes[activeLabel.type].canConvertTo!].icon}
          disabled={!activeLabel || activeLabel.type === 'voxel'}
          onClick={() => handleCommand('convertType')}
        />
      )}
      <IconButton
        bsSize="xs"
        title="Rename"
        icon="font"
        disabled={!activeLabel || disabled}
        onClick={() => handleCommand('rename')}
      />
      <IconButton
        bsSize="xs"
        title="Reveal in Viewer"
        icon="map-marker"
        disabled={!activeLabel || disabled}
        onClick={() => handleCommand('reveal')}
      />
      <IconButton
        bsSize="xs"
        title="Remove"
        icon="trash"
        disabled={!activeLabel || disabled}
        onClick={() => handleCommand('remove')}
      />
      &thinsp;
      <SplitButton
        id="add-label"
        bsSize="xs"
        bsStyle="primary"
        title={
          <span>
            Add <Icon icon={labelTypes[newLabelType].icon} />
          </span>
        }
        onClick={() => addLabel(newLabelType)}
        pullRight
        disabled={disabled}
      >
        {Object.keys(labelTypes).map((type, i) => {
          const { icon } = labelTypes[type as LabelType];
          return (
            <MenuItem
              key={type}
              eventKey={i}
              onClick={() => addLabel(type as LabelType)}
            >
              <Icon icon={icon} /> Add {type}
            </MenuItem>
          );
        })}
      </SplitButton>
    </StyledButtonsDiv>
  );
};

const StyledButtonsDiv = styled.div`
  display: flex;
  margin: 3px 10px;
  .spacer {
    flex-grow: 1;
  }
`;

export default LabelMenu;

////////////////////////////////////////////////////////////////////////////////

const labelColors = [
  '#ff0000',
  '#00ff00',
  '#ffff00',
  '#0000ff',
  '#ff00ff',
  '#00ffff',
  '#ff4400',
  '#ff0044',
  '#88ff00',
  '#afc6fc',
  '#ff5e6e',
  '#aa4433',
  '#ff8888',
  '#ffff88',
  '#aaffaa',
  '#ff88ff'
];

const ColorEditorButton = styled(Button)`
  min-width: 50px;
`;

const AppearanceEditor: React.FC<{
  appearance: LabelAppearance | undefined;
  hidden: boolean;
  disabled?: boolean;
  onChange: (appearance: LabelAppearance, hidden: boolean) => void;
}> = props => {
  const { appearance, hidden, disabled, onChange } = props;
  if (disabled || !appearance) {
    return (
      <ColorEditorButton bsSize="xs" style={{ backgroundColor: '#eeeeee' }}>
        -
      </ColorEditorButton>
    );
  }

  const appearanceEditor = (
    <Popover id="appearance-editor">
      <AppearancePopover
        appearance={appearance}
        hidden={hidden}
        onChange={onChange}
      />
    </Popover>
  );

  return (
    <OverlayTrigger
      trigger="click"
      rootClose
      overlay={appearanceEditor}
      placement="bottom"
    >
      <ColorEditorButton
        className="color-editor-button"
        bsSize="xs"
        style={{
          backgroundColor: appearance.color,
          color: tinyColor.mostReadable(appearance.color, [
            '#ffffff',
            '#000000'
          ])
        }}
      >
        {appearance.alpha * 100}%
      </ColorEditorButton>
    </OverlayTrigger>
  );
};

const AppearancePopover: React.FC<{
  appearance: LabelAppearance;
  hidden: boolean;
  onChange: (apperance: LabelAppearance, hidden: boolean) => void;
}> = props => {
  const { onChange, appearance, hidden } = props;
  const { color, alpha } = appearance;

  return (
    <StyledAppearancePopoverDiv>
      <ColorPalette
        value={color}
        onChange={(color: string) => onChange({ color, alpha }, hidden)}
        colors={labelColors}
      />
      <div className="alpha-pane">
        <IconButton
          icon={hidden ? 'eye-close' : 'eye-open'}
          bsStyle="link"
          bsSize="sm"
          onClick={() => onChange(appearance, !hidden)}
        />
        <Slider
          className="alpha-slider"
          min={0}
          max={100}
          step={10}
          value={alpha * 100}
          onChange={(v: number) => onChange({ color, alpha: v / 100 }, hidden)}
        />
      </div>
    </StyledAppearancePopoverDiv>
  );
};

const StyledAppearancePopoverDiv = styled.div`
  .alpha-pane {
    display: flex;
    align-items: center;
  }
  .alpha-slider {
    width: 85px;
  }
`;
