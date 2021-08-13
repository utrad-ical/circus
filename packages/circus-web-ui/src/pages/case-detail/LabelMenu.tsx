import { ColorPalette } from '@smikitky/rb-components/lib/ColorPicker';
import { alert, prompt } from '@smikitky/rb-components/lib/modal';
import Slider from '@smikitky/rb-components/lib/Slider';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import {
  getSectionFromPoints,
  OrientationString
} from '@utrad-ical/circus-rs/src/browser/section-util';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import {
  Button,
  DropdownButton,
  MenuItem,
  Modal,
  OverlayTrigger,
  Popover,
  SplitButton
} from 'components/react-bootstrap';
import React, { useState } from 'react';
import { ButtonProps } from 'react-bootstrap';
import styled from 'styled-components';
import tinyColor from 'tinycolor2';
import useKeyboardShortcut from 'utils/useKeyboardShortcut';
import useLocalPreference from 'utils/useLocalPreference';
import * as c from './caseStore';
import createCclProcessor, { CclOptions } from './createCclProcessor';
import createCurrentLabelsUpdator from './createCurrentLabelsUpdator';
import createHfProcessor, { HoleFillingOptions } from './createHfProcessor';
import {
  createNewLabelData,
  InternalLabel,
  InternalLabelData,
  InternalLabelOf,
  LabelAppearance,
  LabelType,
  labelTypes
} from './labelData';
import performLabelCreatingVoxelProcessing from './performLabelCreatingVoxelProcessing';
import { EditingData, EditingDataUpdater } from './revisionData';
import SettingDialogCCL from './SettingDialogCCL';
import SettingDialogHF from './SettingDialogHF';
import validationSectionFromPoints from './validationSectionFromPoints';

type LabelCommand =
  | 'rename'
  | 'remove'
  | 'convertType'
  | 'reveal'
  | 'toggleHideAllLabels';

const LabelMenu: React.FC<{
  editingData: EditingData;
  onReveal: () => void;
  updateEditingData: EditingDataUpdater;
  caseDispatch: React.Dispatch<any>;
  viewers: { [index: string]: Viewer };
  disabled?: boolean;
}> = props => {
  const {
    editingData,
    onReveal,
    updateEditingData,
    caseDispatch,
    viewers,
    disabled
  } = props;

  const [newLabelType, setNewLabelType] = useLocalPreference<LabelType>(
    'newLabelType',
    'voxel'
  );

  const [cclDialogOpen, setCclDialogOpen] = useState(false);
  const [hfDialogOpen, setHfDialogOpen] = useState(false);
  const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];
  const activeLabel =
    activeLabelIndex >= 0 ? activeSeries.labels[activeLabelIndex] : null;

  const updateCurrentLabels = createCurrentLabelsUpdator(
    editingData,
    updateEditingData
  );

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
        updateEditingData(editingData => {
          const series = editingData.revision.series[activeSeriesIndex];
          series.labels.splice(activeLabelIndex, 1);
          if (series.labels.length === 0) {
            editingData.activeLabelIndex = -1;
          } else if (activeLabelIndex >= series.labels.length) {
            editingData.activeLabelIndex = series.labels.length - 1;
          }
        });
        caseDispatch(
          c.validateLabelAttributes({
            key: activeLabel!.temporaryKey,
            valid: true
          })
        );
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
        onReveal();
        break;
      }
      case 'toggleHideAllLabels': {
        updateEditingData(editingData => {
          editingData.allLabelsHidden = !editingData.allLabelsHidden;
        }, 'hide all labels');
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

  const createNewLabel = (
    type: LabelType,
    viewer: Viewer | undefined,
    color = labelColors[0]
  ): InternalLabel => {
    const alpha = 1;
    const temporaryKey = generateUniqueId();
    const labelNames: { [key in LabelType]: string } = {
      voxel: 'Voxels',
      ellipsoid: '3D Shape',
      cuboid: '3D Shape',
      ellipse: '2D Shape',
      rectangle: '2D Shape',
      point: 'Point',
      ruler: 'Ruler'
    };
    const name = getUniqueLabelName(labelNames[type]);
    const data = createNewLabelData(
      type,
      { color, alpha },
      viewer
    ) as InternalLabelData;
    return { temporaryKey, name, ...data, attributes: {}, hidden: false };
  };

  const addLabel = async (type: LabelType) => {
    setNewLabelType(type);

    const basic: OrientationString[] = ['axial', 'sagittal', 'coronal'];
    const allowedOrientations: { [key in LabelType]: OrientationString[] } = {
      voxel: basic,
      cuboid: basic,
      ellipsoid: basic,
      ellipse: ['axial'],
      rectangle: ['axial'],
      point: [...basic, 'oblique'],
      ruler: [...basic, 'oblique']
    };

    const viewerId = editingData.activeLayoutKey;

    if (!viewerId) {
      await alert(
        'Select the viewer on which you want to place the new label. ' +
          'Click the header.'
      );
      return;
    }

    const orientation = editingData.layoutItems.find(
      item => item.key === viewerId
    )!.orientation;
    if (allowedOrientations[type].indexOf(orientation) < 0) {
      await alert(
        'The orientation of the selected viewer must be ' +
          allowedOrientations[type].join(' or ') +
          '.'
      );
      return;
    }

    const color = editingData.revision.series[activeSeriesIndex].labels.reduce(
      (colors, label) => {
        if (colors.indexOf(label.data.color) < 0) {
          return colors;
        }
        colors.splice(colors.indexOf(label.data.color), 1);
        return colors.length === 0 ? labelColors.slice() : colors;
      },
      labelColors.slice()
    )[0];
    const newLabel = createNewLabel(type, viewers[viewerId], color);
    updateEditingData(editingData => {
      const labels = editingData.revision.series[activeSeriesIndex].labels;
      labels.push(newLabel);
      editingData.activeLabelIndex = labels.length - 1;
    });
  };

  const onOkClickDialogCCL = (props: CclOptions) => {
    const label = editingData.revision.series[activeSeriesIndex].labels[
      activeLabelIndex
    ] as InternalLabelOf<'voxel'>;
    performLabelCreatingVoxelProcessing(
      editingData,
      updateEditingData,
      label,
      labelColors,
      createCclProcessor(props)
    );
    setCclDialogOpen(false);
  };

  const onOkClickDialogHF = (props: HoleFillingOptions) => {
    const label = editingData.revision.series[activeSeriesIndex].labels[
      activeLabelIndex
    ] as InternalLabelOf<'voxel'>;
    performLabelCreatingVoxelProcessing(
      editingData,
      updateEditingData,
      label,
      labelColors,
      createHfProcessor(props)
    );
    setHfDialogOpen(false);
  };

  const onSelectThreePoints2Section = () => {
    {
      const points = validationSectionFromPoints(
        editingData.revision.series[activeSeriesIndex].labels.filter(label => {
          return label.type === 'point';
        }) as InternalLabelOf<'point'>[],
        activeLabel!.name!
      );
      if (typeof points === 'string') {
        alert(points);
        return;
      }
      try {
        const section = getSectionFromPoints(
          points,
          viewers[editingData.activeLayoutKey!].getState().section
        );
        let targetKey = '';
        updateEditingData(d => {
          const [layoutItems, layout, key] = c.addNewCellItem(
            editingData.layoutItems,
            editingData.layout,
            'oblique',
            activeSeriesIndex,
            section
          );
          targetKey = key;
          d.layoutItems = layoutItems;
          d.layout = layout;
          d.activeLayoutKey = key;
        });
      } catch (err) {
        alert(err.message);
      }
    }
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
      <IconButton
        icon={editingData.allLabelsHidden ? 'eye-open' : 'eye-close'}
        bsStyle="link"
        bsSize="xs"
        onClick={() => handleCommand('toggleHideAllLabels')}
      >
        All
      </IconButton>
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
      <ShortcutIconButton
        shortcut="R"
        bsSize="xs"
        title="Reveal in Viewer (R)"
        icon="map-marker"
        disabled={!activeLabel || disabled}
        onClick={() => handleCommand('reveal')}
      />
      <DropdownButton
        bsSize="xs"
        title={<Icon icon="glyphicon-option-horizontal" />}
        id={`labelmenu-header-dropdown`}
        pullRight
        noCaret
      >
        <MenuItem
          eventKey="ccl"
          onSelect={() => {
            setCclDialogOpen(true);
          }}
          disabled={!activeLabel || activeLabel.type !== 'voxel'}
        >
          CCL
        </MenuItem>
        <MenuItem
          eventKey="fillng"
          onSelect={() => {
            setHfDialogOpen(true);
          }}
          disabled={!activeLabel || activeLabel.type !== 'voxel'}
        >
          Hole filling
        </MenuItem>
        <MenuItem
          eventKey="section"
          onSelect={() => onSelectThreePoints2Section()}
          disabled={!activeLabel || activeLabel.type !== 'point'}
        >
          Three points to section
        </MenuItem>
      </DropdownButton>
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
      <Modal
        show={cclDialogOpen}
        onHide={() => setCclDialogOpen(false)}
        bsSize="lg"
      >
        <SettingDialogCCL
          onHide={() => setCclDialogOpen(false)}
          onOkClick={onOkClickDialogCCL}
        />
      </Modal>
      <Modal
        show={hfDialogOpen}
        onHide={() => setHfDialogOpen(false)}
        bsSize="lg"
      >
        <SettingDialogHF
          onHide={() => setHfDialogOpen(false)}
          onOkClick={onOkClickDialogHF}
        />
      </Modal>
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
          color: tinyColor
            .mostReadable(appearance.color, ['#ffffff', '#000000'])
            .toHex8String()
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

const ShortcutIconButton: React.FC<
  { shortcut: string; icon: string } & ButtonProps
> = props => {
  const { shortcut, ...rest } = props;
  useKeyboardShortcut(shortcut, props.onClick ?? (() => {}));
  return <IconButton {...rest} />;
};
