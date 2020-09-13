import { ColorPalette } from '@smikitky/rb-components/lib/ColorPicker';
import { confirm, prompt } from '@smikitky/rb-components/lib/modal';
import Slider from '@smikitky/rb-components/lib/Slider';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import { Composition, Viewer } from '@utrad-ical/circus-rs/src/browser';
import focusBy from '@utrad-ical/circus-rs/src/browser/tool/state/focusBy';
import classNames from 'classnames';
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
import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import tinyColor from 'tinycolor2';
import useLocalPreference from 'utils/useLocalPreference';
import {
  labelTypes,
  createNewLabelData,
  EditingData,
  EditingDataUpdater,
  getCenterOfLabel,
  InternalLabel,
  LabelAppearance,
  LabelType,
  SeriesEntryWithLabels
} from './revisionData';

const LabelSelector: React.FC<{
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

  const handleAppearanceChange = (value: LabelAppearance) => {
    updateEditingData(editingData => {
      const data =
        editingData.revision.series[activeSeriesIndex].labels[activeLabelIndex]
          .data;
      data.color = value.color;
      data.alpha = value.alpha;
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
    return { temporaryKey, name, ...data, attributes: {} };
  };

  const addLabel = (type: LabelType) => {
    setNewLabelType(type);
    const newLabel = createNewLabel(type);
    updateCurrentLabels(labels => {
      labels.push(newLabel);
    });
  };

  return (
    <>
      <StyledButtonsDiv>
        <AppearanceEditor
          value={
            activeLabel
              ? {
                  color: activeLabel.data.color,
                  alpha: activeLabel.data.alpha
                }
              : undefined
          }
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
      <StyledSeriesUl>
        {revision.series.map(
          (series: SeriesEntryWithLabels, seriesIndex: number) => (
            <Series
              key={`${seriesIndex}:${series.seriesUid}`}
              updateEditingData={updateEditingData}
              series={series}
              seriesIndex={seriesIndex}
              activeSeries={activeSeries}
              activeLabel={activeLabel}
              disabled={disabled}
            />
          )
        )}
      </StyledSeriesUl>
    </>
  );
};

const StyledButtonsDiv = styled.div`
  display: flex;
  margin: 3px 10px;
  .spacer {
    flex-grow: 1;
  }
`;

const StyledSeriesUl = styled.ul`
  padding: 0;
  border-top: 1px solid silver;

  > li {
    margin-top: 10px;
    padding-left: 10px;
    list-style-type: none;
    .series-head .circus-icon {
      font-size: 130%;
    }
    &.active .series-head {
      font-weight: bold;
    }
  }

  .case-label-list {
    margin: 0;
    padding-left: 10px;
    &.active {
      background-color: silver;
    }
  }

  .no-labels {
    list-style-type: none;
    color: gray;
  }

  .label-list-item {
    white-space: nowrap;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 3px 0px 3px 10px;
    border-bottom: 1px solid silver;
    cursor: pointer;
    .color-preview {
      display: block;
      flex: 0 0 25px;
      height: 20px;
      text-align: center;
      border: 1px solid silver;
    }
    .caption {
      .circus-icon {
        font-size: 130%;
      }
      flex-grow: 1;
      margin-left: 15px;
      overflow: hidden;
    }
    &:hover {
      background-color: #eeeeee;
    }
    &.active {
      background-color: silver;
      font-weight: bold;
    }
    &.drag-top {
      border-top: 3px solid gray;
    }
    &.drag-bottom {
      border-bottom: 3px solid gray;
    }
    * {
      pointer-events: none; /* Needed for drag & drop */
    }
  }
`;

export default LabelSelector;

type LabelCommand = 'rename' | 'remove' | 'convertType' | 'reveal';

const Series: React.FC<{
  seriesIndex: number;
  series: SeriesEntryWithLabels;
  activeSeries: SeriesEntryWithLabels;
  activeLabel: InternalLabel | null;
  updateEditingData: EditingDataUpdater;
  disabled?: boolean;
}> = props => {
  const {
    seriesIndex,
    series,
    activeSeries,
    activeLabel,
    updateEditingData,
    disabled
  } = props;

  const handleClick = () => {
    if (disabled) return;
    updateEditingData(editingData => {
      if (editingData.activeSeriesIndex !== seriesIndex) {
        editingData.activeSeriesIndex = seriesIndex;
        editingData.activeLabelIndex = series.labels.length ? 0 : -1;
      }
    }, 'Change active label');
  };

  return (
    <li
      className={classNames({ active: series === activeSeries })}
      onClick={handleClick}
    >
      <span className="series-head">
        <Icon icon="circus-series" /> Series #{seriesIndex}
      </span>
      <ul className="case-label-list">
        {series.labels.map((label, labelIndex) => (
          <Label
            key={label.temporaryKey}
            label={label}
            activeLabel={activeLabel}
            seriesIndex={seriesIndex}
            labelIndex={labelIndex}
            updateEditingData={updateEditingData}
            disabled={disabled}
          />
        ))}
        {!series.labels.length && <li className="no-labels">No labels.</li>}
      </ul>
    </li>
  );
};

const StyledLabelNameNone = styled.span`
  color: gray;
`;

// We cannot access drag data during the drag, so we rely on global var here
// https://stackoverflow.com/q/11927309/1209240
let dragData: { seriesIndex: number; labelIndex: number };

export const Label: React.FC<{
  label: InternalLabel;
  labelIndex: number;
  seriesIndex: number;
  activeLabel: InternalLabel | null;
  updateEditingData: EditingDataUpdater;
  disabled?: boolean;
}> = props => {
  const {
    label,
    activeLabel,
    seriesIndex,
    labelIndex,
    updateEditingData,
    disabled
  } = props;

  const [isDragOver, setIsDragOver] = useState<false | 'top' | 'bottom'>(false);
  const liRef = useRef<HTMLLIElement>(null);

  const caption = label.name ? (
    <>{label.name}</>
  ) : (
    <StyledLabelNameNone>Label</StyledLabelNameNone>
  );

  const handleClick = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (disabled) return;
    updateEditingData(editingData => {
      editingData.activeSeriesIndex = seriesIndex;
      editingData.activeLabelIndex = labelIndex;
    }, 'Change active label');
  };

  const handleDragStart = (ev: React.DragEvent) => {
    ev.dataTransfer.setData('text/x-circusdb-label', '');
    dragData = { seriesIndex, labelIndex };
    ev.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (ev: React.DragEvent) => {
    if (
      ev.dataTransfer.types.indexOf('text/x-circusdb-label') < 0 ||
      dragData.seriesIndex !== seriesIndex ||
      dragData.labelIndex === labelIndex
    )
      return;

    const li = ev.target as HTMLLIElement;
    const rect = li.getBoundingClientRect();
    const y = ev.clientY - rect.top; // y position within the element
    if (y < li.clientHeight / 2) {
      if (labelIndex === dragData.labelIndex + 1) return;
      setIsDragOver('top');
    } else {
      if (labelIndex === dragData.labelIndex - 1) return;
      setIsDragOver('bottom');
    }
    ev.preventDefault(); // accept drag
  };

  const handleDragLeave = (ev: React.DragEvent) => {
    setIsDragOver(false);
  };

  const handleDrop = (ev: React.DragEvent) => {
    if (
      ev.dataTransfer.types.indexOf('text/x-circusdb-label') < 0 ||
      seriesIndex !== dragData.seriesIndex
    )
      return;
    ev.preventDefault();
    updateEditingData(d => {
      const series = d.revision.series[dragData.seriesIndex];
      const label = series.labels[dragData.labelIndex];
      const insertIndex = labelIndex + (isDragOver === 'top' ? 0 : 1);
      const dragUp = labelIndex <= dragData.labelIndex;
      series.labels.splice(insertIndex, 0, label);
      series.labels.splice(dragData.labelIndex + (dragUp ? 1 : 0), 1);
      d.activeLabelIndex = insertIndex + (dragUp ? 0 : -1);
    }, 'Sort label');
    setIsDragOver(false);
  };

  return (
    <li
      ref={liRef}
      className={classNames('label-list-item', {
        active: label === activeLabel,
        'drag-top': isDragOver === 'top',
        'drag-bottom': isDragOver === 'bottom'
      })}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div
        className="color-preview"
        style={{ backgroundColor: label.data.color }}
      >
        {label.data.alpha === 0 && <Icon icon="eye-close" />}
      </div>
      <div className="caption">
        <Icon icon={labelTypes[label.type].icon} />
        &nbsp;{caption}
      </div>
    </li>
  );
};

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
  value: LabelAppearance | undefined;
  disabled?: boolean;
  onChange: (value: LabelAppearance) => void;
}> = props => {
  const { value, disabled, onChange } = props;
  if (disabled) {
    return (
      <ColorEditorButton bsSize="xs" style={{ backgroundColor: '#eeeeee' }}>
        -
      </ColorEditorButton>
    );
  }

  const appearanceEditor = (
    <Popover id="appearance-editor">
      <AppearancePopover value={value!} onChange={onChange} />
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
          backgroundColor: value!.color,
          color: tinyColor.mostReadable(value!.color, ['#ffffff', '#000000'])
        }}
      >
        {value!.alpha * 100}%
      </ColorEditorButton>
    </OverlayTrigger>
  );
};

const AppearancePopover: React.FC<{
  value: LabelAppearance;
  onChange: (value: LabelAppearance) => void;
}> = props => {
  const {
    onChange,
    value: { color, alpha }
  } = props;
  return (
    <StyledAppearancePopoverDiv>
      <ColorPalette
        value={color}
        onChange={(color: string) => onChange({ color, alpha })}
        colors={labelColors}
      />
      <div className="alpha-pane">
        <IconButton
          icon={alpha === 0 ? 'eye-close' : 'eye-open'}
          bsStyle="link"
          bsSize="sm"
          onClick={() => onChange({ color, alpha: alpha === 0 ? 1 : 0 })}
        />
        <Slider
          className="alpha-slider"
          min={0}
          max={100}
          step={10}
          value={alpha * 100}
          onChange={(v: number) => onChange({ color, alpha: v / 100 })}
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
