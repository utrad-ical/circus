import { ColorPalette } from '@smikitky/rb-components/lib/ColorPicker';
import { confirm, prompt } from '@smikitky/rb-components/lib/modal';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import Slider from '@smikitky/rb-components/lib/Slider';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import { Composition, Viewer } from '@utrad-ical/circus-rs/src/browser';
import focusBy from '@utrad-ical/circus-rs/src/browser/tool/state/focusBy';
import classNames from 'classnames';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import {
  Button,
  OverlayTrigger,
  Popover,
  SplitButton,
  MenuItem
} from 'components/react-bootstrap';
import produce from 'immer';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import useLocalPreference from 'utils/useLocalPreference';
import tinyColor from 'tinycolor2';
import {
  createNewLabelData,
  EditingData,
  EditingDataUpdater,
  getCenterOfLabel,
  InternalLabel,
  LabelType,
  SeriesEntry,
  LabelAppearance
} from './revisionData';

const labelTypeOptions: {
  [key in LabelType]: { caption: string; icon: string };
} = {
  voxel: { caption: 'voxel', icon: 'circus-annotation-voxel' },
  cuboid: { caption: 'cuboid', icon: 'circus-annotation-cuboid' },
  ellipsoid: { caption: 'ellipsoid', icon: 'circus-annotation-ellipsoid' },
  rectangle: { caption: 'rectangle', icon: 'circus-annotation-rectangle' },
  ellipse: { caption: 'ellipse', icon: 'circus-annotation-ellipse' }
};

const LabelTypeRenderer: React.FC<{
  icon: string;
  caption: string;
}> = props => {
  return (
    <Fragment>
      <Icon icon={props.icon} />
      &ensp;
      <span className="caption">{props.caption}</span>
    </Fragment>
  );
};

const convertLabelTypeMap: { [type in LabelType]?: LabelType } = {
  cuboid: 'ellipsoid',
  ellipsoid: 'cuboid',
  rectangle: 'ellipse',
  ellipse: 'rectangle'
};

const LabelSelector: React.FC<{
  editingData: EditingData;
  composition: Composition;
  onChange: EditingDataUpdater;
  onChangeActiveLabel: (seriesIndex: number, labelIndex: number) => void;
  viewers: { [index: string]: Viewer };
}> = props => {
  const {
    editingData,
    composition,
    onChange,
    onChangeActiveLabel,
    viewers
  } = props;

  const [newLabelType, setNewLabelType] = useLocalPreference<LabelType>(
    'newLabelType',
    'voxel'
  );

  const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];
  const activeLabel =
    activeLabelIndex >= 0 ? activeSeries.labels[activeLabelIndex] : null;

  const changeSeries = (
    index: number,
    newSeries: SeriesEntry,
    tag?: string
  ) => {
    onChange(editingData => {
      editingData.revision.series[index] = newSeries;
    }, tag);
  };

  const handleCommand = async (command: LabelCommand) => {
    switch (command) {
      case 'rename': {
        if (!activeLabel) return;
        const newName = await prompt('Label name', activeLabel.name);
        if (newName === null || activeLabel.name === newName) return;
        const newSeries = produce(activeSeries, series => {
          series.labels[activeLabelIndex].name = newName;
        });
        changeSeries(activeSeriesIndex, newSeries);
        break;
      }
      case 'remove': {
        if (!(await confirm('Delete this label?'))) return;
        onChange(editingData => {
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
      case 'moveUp': {
        if (activeLabelIndex <= 0) return;
        onChange(editingData => {
          const series = editingData.revision.series[activeSeriesIndex];
          series.labels.splice(
            activeLabelIndex - 1,
            2,
            series.labels[activeLabelIndex],
            series.labels[activeLabelIndex - 1]
          );
          editingData.activeLabelIndex--;
        }, 'Move label position');
        break;
      }
      case 'moveDown': {
        if (activeLabelIndex >= activeSeries.labels.length - 1) return;
        onChange(editingData => {
          const series = editingData.revision.series[activeSeriesIndex];
          series.labels.splice(
            activeLabelIndex,
            2,
            series.labels[activeLabelIndex + 1],
            series.labels[activeLabelIndex]
          );
          editingData.activeLabelIndex++;
        }, 'Move label position');
        break;
      }
      case 'convertType': {
        if (!activeLabel) return;
        const newLabelType = convertLabelTypeMap[activeLabel.type];
        if (!newLabelType) return;
        const newSeries = produce(activeSeries, series => {
          series.labels[activeLabelIndex].type = newLabelType;
        });
        changeSeries(activeSeriesIndex, newSeries);
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
    onChange(editingData => {
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
    const newSeries = produce(activeSeries, series => {
      series.labels.push(newLabel);
    });
    changeSeries(activeSeriesIndex, newSeries);
  };

  const convertTitle = activeLabel
    ? convertLabelTypeMap[activeLabel.type]
      ? 'Convert to ' + convertLabelTypeMap[activeLabel.type]
      : 'Convert'
    : '';

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
          disabled={!activeLabel}
          onChange={handleAppearanceChange}
        />
        &thinsp;
        <IconButton
          bsSize="xs"
          title="Move Up"
          icon="chevron-up"
          disabled={!activeLabel || activeLabelIndex <= 0}
          onClick={() => handleCommand('moveUp')}
        />
        <IconButton
          bsSize="xs"
          title="Move Down"
          icon="chevron-down"
          disabled={
            !activeLabel || activeLabelIndex >= activeSeries.labels.length - 1
          }
          onClick={() => handleCommand('moveDown')}
        />
        <IconButton
          bsSize="xs"
          title="Rename"
          icon="font"
          disabled={!activeLabel}
          onClick={() => handleCommand('rename')}
        />
        <IconButton
          bsSize="xs"
          title={convertTitle}
          icon="random"
          disabled={!activeLabel || activeLabel.type === 'voxel'}
          onClick={() => handleCommand('convertType')}
        />
        <IconButton
          bsSize="xs"
          title="Reveal in Viewer"
          icon="map-marker"
          disabled={!activeLabel}
          onClick={() => handleCommand('reveal')}
        />
        <IconButton
          bsSize="xs"
          title="Remove"
          icon="trash"
          disabled={!activeLabel}
          onClick={() => handleCommand('remove')}
        />
        &thinsp;
        <SplitButton
          bsSize="xs"
          bsStyle="primary"
          title={
            <span>
              Add <Icon icon={labelTypeOptions[newLabelType].icon} />
            </span>
          }
          onClick={() => addLabel(newLabelType)}
          pullRight
        >
          {Object.keys(labelTypeOptions).map((type, i) => {
            const { caption, icon } = labelTypeOptions[type as LabelType];
            return (
              <MenuItem
                key={type}
                eventKey={i}
                onClick={() => addLabel(type as LabelType)}
              >
                <Icon icon={icon} /> Add {caption}
              </MenuItem>
            );
          })}
        </SplitButton>
      </StyledButtonsDiv>
      <StyledSeriesUl>
        {revision.series.map((series: SeriesEntry, seriesIndex: number) => (
          <Series
            series={series}
            index={seriesIndex}
            key={series.seriesUid}
            onChangeActiveLabel={onChangeActiveLabel}
            activeSeries={activeSeries}
            activeLabel={activeLabel}
          />
        ))}
      </StyledSeriesUl>
    </>
  );
};

const StyledButtonsDiv = styled.div`
  margin: 3px 10px;
`;

const StyledSeriesUl = styled.ul`
  padding: 0;
  > li {
    margin-top: 10px;
    list-style-type: none;
    &.active .series-head {
      font-weight: bold;
    }
  }

  .case-label-list {
    margin: 0;
    padding-left: 0;
    &.active {
      background-color: silver;
    }
  }

  .label-list-item {
    list-style-type: none;
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
      margin-left: 5px;
      overflow: hidden;
    }
    &:hover {
      background-color: #eeeeee;
    }
    &.active {
      background-color: silver;
      font-weight: bold;
    }
  }
`;

export default LabelSelector;

type LabelCommand =
  | 'rename'
  | 'remove'
  | 'moveUp'
  | 'moveDown'
  | 'convertType'
  | 'reveal';

const Series: React.FC<{
  index: number;
  series: SeriesEntry;
  activeSeries: SeriesEntry;
  activeLabel: InternalLabel | null;
  onChangeActiveLabel: (seriesIndex: number, labelIndex: number) => void;
}> = props => {
  const {
    index: seriesIndex,
    series,
    activeSeries,
    activeLabel,
    onChangeActiveLabel
  } = props;

  return (
    <li className={classNames({ active: series === activeSeries })}>
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
            index={labelIndex}
            onClick={() => onChangeActiveLabel(seriesIndex, labelIndex)}
          />
        ))}
      </ul>
    </li>
  );
};

const StyledLabelNameNone = styled.span`
  color: gray;
`;

export const Label: React.FC<{
  label: InternalLabel;
  index: number;
  seriesIndex: number;
  activeLabel: InternalLabel | null;
  onClick: () => void;
}> = props => {
  const { label, activeLabel, onClick } = props;

  const caption = label.name ? (
    <>{label.name}</>
  ) : (
    <StyledLabelNameNone>Label</StyledLabelNameNone>
  );

  return (
    <li
      className={classNames('label-list-item', {
        active: label === activeLabel
      })}
      onClick={onClick}
    >
      <div
        className="color-preview"
        style={{ backgroundColor: label.data.color }}
      >
        {label.data.alpha === 0 && <Icon icon="eye-close" />}
      </div>
      <div className="caption">
        <Icon icon={labelTypeOptions[label.type].icon} />
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
      <Button bsSize="xs" style={{ backgroundColor: 'silver' }}>
        -
      </Button>
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
