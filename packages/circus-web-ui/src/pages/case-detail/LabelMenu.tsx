import { ColorPalette } from '@smikitky/rb-components/lib/ColorPicker';
import { alert, prompt } from '@smikitky/rb-components/lib/modal';
import Slider from '@smikitky/rb-components/lib/Slider';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import { OrientationString } from '@utrad-ical/circus-rs/src/browser/section-util';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import {
  Button,
  MenuItem,
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
import createCurrentLabelsUpdator from './createCurrentLabelsUpdator';
import {
  createNewLabelData,
  InternalLabel,
  InternalLabelData,
  LabelAppearance,
  LabelType,
  labelTypes
} from './labelData';
import {
  processors,
  ProcessorType,
  ProcessorProgress
} from './processors/processor-types';
import ProcessorDropdown from './processors/ProcessorDropdown';
import ProcessorModal from './processors/ProcessorModal';
import { EditingData, EditingDataUpdater } from './revisionData';

type LabelCommand =
  | 'rename'
  | 'remove'
  | 'convertType'
  | 'reveal'
  | 'toggleHideAllLabels';

type ProcessorState = {
  type: null | ProcessorType;
  showModal: boolean;
  progress: null | ProcessorProgress;
};

const LabelMenu: React.FC<{
  editingData: EditingData;
  onReveal: () => void;
  updateEditingData: EditingDataUpdater;
  caseDispatch: React.Dispatch<any>;
  viewers: { [index: string]: Viewer };
  disabled?: boolean;
  metadata: (DicomVolumeMetadata | undefined)[];
}> = props => {
  const {
    editingData,
    onReveal,
    updateEditingData,
    caseDispatch,
    viewers,
    disabled,
    metadata
  } = props;

  const [processorState, setProcessorState] = useState<ProcessorState>({
    type: null,
    showModal: false,
    progress: null
  });

  const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
  const activeSeriesMetadata = metadata[activeSeriesIndex];
  const activeSeries = revision.series[activeSeriesIndex];
  const activeLabel =
    activeLabelIndex >= 0 ? activeSeries.labels[activeLabelIndex] : null;

  const [defaultNewLabelType, setDefaultLabelType] =
    useLocalPreference<LabelType>('defaultLabelType', 'voxel');
  const newLabelType =
    !labelTypes[defaultNewLabelType].allow2D &&
    activeSeriesMetadata?.mode !== '3d'
      ? 'ruler'
      : defaultNewLabelType;

  const updateCurrentLabels = createCurrentLabelsUpdator(
    editingData,
    updateEditingData
  );

  const handleProcesssorSelect = (type: ProcessorType) => {
    if (processors[type].settingsModal) {
      setProcessorState(s => ({ ...s, type, showModal: true }));
    } else {
      executeProcessor(null); // no modal, executes right away
    }
  };

  const executeProcessor = (options: any) => {
    if (!processorState.type) return;
    const { processor } = processors[processorState.type];

    const selectedLabel =
      editingData.revision.series[activeSeriesIndex].labels[activeLabelIndex];

    const reportProgress = (progress: ProcessorProgress) => {
      setProcessorState(s => ({ ...s, progress }));
      if (progress.label !== '') {
        setProcessorState({ type: null, showModal: false, progress: null });
      }
    };

    processor({
      options,
      editingData,
      updateEditingData,
      selectedLabel,
      reportProgress,
      hints: { labelColors, viewers, seriesMetadata: metadata }
    });
  };

  const handleHideProcessorModal = () => {
    setProcessorState({ type: null, showModal: false, progress: null });
  };

  const handleCommand = async (command: LabelCommand) => {
    if (disabled) return;
    switch (command) {
      case 'rename': {
        if (!activeLabel) return;
        const newName = await prompt('Label name', activeLabel.name || '');
        if (newName === null || activeLabel.name === newName) return;
        updateCurrentLabels((labels: InternalLabel[]) => {
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
        updateCurrentLabels((labels: InternalLabel[]) => {
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
    viewer: Viewer,
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
    setDefaultLabelType(type);

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

    if (
      !labelTypes[type].allow2D &&
      viewers[viewerId].getState()?.type !== 'mpr'
    ) {
      await alert('2D viewer does not support ' + type + ' labels.');
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
      <ProcessorDropdown
        activeLabelType={activeLabel?.type}
        onSelect={handleProcesssorSelect}
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
          const { icon, allow2D } = labelTypes[type as LabelType];
          const disabled = activeSeriesMetadata?.mode !== '3d' && !allow2D;
          return (
            <MenuItem
              key={type}
              eventKey={i}
              onSelect={() => addLabel(type as LabelType)}
              disabled={disabled}
            >
              <Icon icon={icon} /> Add {type}
            </MenuItem>
          );
        })}
      </SplitButton>
      {processorState.showModal && (
        <ProcessorModal
          onHide={handleHideProcessorModal}
          onOkClick={executeProcessor}
          progress={processorState.progress}
          {...processors[processorState.type!].settingsModal!}
        />
      )}
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
