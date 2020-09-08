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
import { Button, OverlayTrigger, Popover } from 'components/react-bootstrap';
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
  const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];
  const activeLabel = activeSeries.labels[activeLabelIndex];

  const handleChangeSeries = (
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
        const newName = await prompt('Label name', activeLabel.name);
        if (newName === null || activeLabel.name === newName) return;
        const newSeries = produce(activeSeries, series => {
          series.labels[activeLabelIndex].name = newName;
        });
        handleChangeSeries(activeSeriesIndex, newSeries);
        break;
      }
      case 'remove': {
        if (!(await confirm('Delete this label?'))) return;
        const newSeries = produce(activeSeries, series => {
          series.labels.splice(activeLabelIndex, 1);
        });
        handleChangeSeries(activeSeriesIndex, newSeries);
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
        const newLabelType = convertLabelTypeMap[activeLabel.type];
        if (!newLabelType) return;
        const newSeries = produce(activeSeries, series => {
          series.labels[activeLabelIndex].type = newLabelType;
        });
        handleChangeSeries(activeSeriesIndex, newSeries);
        break;
      }
      case 'reveal': {
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

  const convertTitle = convertLabelTypeMap[activeLabel.type]
    ? 'Convert to ' + convertLabelTypeMap[activeLabel.type]
    : 'Convert';

  return (
    <>
      <div className="buttons">
        <AppearanceEditor
          value={{
            color: activeLabel.data.color,
            alpha: activeLabel.data.alpha
          }}
          onChange={handleAppearanceChange}
        />
        &ensp;
        <IconButton
          bsSize="xs"
          title="Move Up"
          icon="chevron-up"
          disabled={activeLabelIndex <= 0}
          onClick={() => handleCommand('moveUp')}
        />
        <IconButton
          bsSize="xs"
          title="Move Down"
          icon="chevron-down"
          disabled={activeLabelIndex >= activeSeries.labels.length - 1}
          onClick={() => handleCommand('moveDown')}
        />
        <IconButton
          bsSize="xs"
          title="Rename"
          icon="font"
          onClick={() => handleCommand('rename')}
        />
        <IconButton
          bsSize="xs"
          title={convertTitle}
          icon="random"
          disabled={activeLabel.type === 'voxel'}
          onClick={() => handleCommand('convertType')}
        />
        <IconButton
          bsSize="xs"
          title="Reveal in Viewer"
          icon="map-marker"
          onClick={() => handleCommand('reveal')}
        />
        <IconButton
          bsSize="xs"
          title="Remove"
          icon="trash"
          onClick={() => handleCommand('remove')}
        />
      </div>
      <ul className="case-series-list">
        {revision.series.map((series: SeriesEntry, seriesIndex: number) => (
          <Series
            series={series}
            index={seriesIndex}
            key={series.seriesUid}
            onChange={handleChangeSeries}
            onChangeActiveLabel={onChangeActiveLabel}
            activeSeries={activeSeries}
            activeLabel={activeLabel}
            viewers={viewers}
          />
        ))}
      </ul>
    </>
  );
};

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
  activeLabel: InternalLabel;
  onChange: (seriesIndex: number, newSeries: SeriesEntry, tag?: string) => void;
  onChangeActiveLabel: (seriesIndex: number, labelIndex: number) => void;
  viewers: { [index: string]: Viewer };
}> = props => {
  const {
    index: seriesIndex,
    series,
    activeSeries,
    activeLabel,
    onChange,
    onChangeActiveLabel,
    viewers
  } = props;

  const [newLabelType, setNewLabelType] = useLocalPreference<LabelType>(
    'newLabelType',
    'voxel'
  );

  const getUniqueLabelName = (name: string) => {
    const nameExists = (name: string) =>
      activeSeries.labels.some(label => label.name === name);
    if (!nameExists(name)) return name;
    for (let index = 2; ; index++) {
      const newName = name + ' ' + index;
      if (!nameExists(newName)) return newName;
    }
  };

  const createNewLabel = (): InternalLabel => {
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
    const name = getUniqueLabelName(labelNames[newLabelType]);
    const data = createNewLabelData(newLabelType, { color, alpha }, viewers);
    return { temporaryKey, name, ...data, attributes: {} };
  };

  const addLabel = () => {
    const newLabel = createNewLabel();
    const newSeries = produce(series, series => {
      series.labels.push(newLabel);
    });
    onChange(seriesIndex, newSeries);
  };

  return (
    <li
      className={classNames('case-series-list-item', {
        active: series === activeSeries
      })}
    >
      <Icon icon="circus-series" /> Series #{seriesIndex}
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
      <div className="case-label-buttons">
        <ShrinkSelect
          className="label-type-shrinkselect"
          name="label-type"
          bsSize="xs"
          defaultSelect={newLabelType}
          options={labelTypeOptions}
          value={newLabelType}
          onChange={setNewLabelType}
          renderer={LabelTypeRenderer}
        />
        <IconButton icon="plus" bsSize="xs" onClick={addLabel}>
          Add Label
        </IconButton>
      </div>
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
  activeLabel: InternalLabel;
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

const AppearanceEditor: React.FC<{
  value: LabelAppearance;
  onChange: (value: LabelAppearance) => void;
}> = props => {
  const { value } = props;
  const appearanceEditor = (
    <Popover id="appearance-editor">
      <AppearancePopover {...props} />
    </Popover>
  );
  return (
    <OverlayTrigger
      trigger="click"
      rootClose
      overlay={appearanceEditor}
      placement="bottom"
    >
      <Button
        bsSize="xs"
        style={{
          backgroundColor: value.color,
          color: tinyColor.mostReadable(value.color, ['#ffffff', '#000000'])
        }}
      >
        {value.alpha * 100}%
      </Button>
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
    <div className="label-list-color-dropdown">
      <ColorPalette
        value={color}
        onChange={(color: string) => onChange({ color, alpha })}
        colors={labelColors}
      />
      <div className="label-list-opacity-dropdown">
        {alpha === 0 ? (
          <IconButton
            icon="eye-close"
            bsStyle="link"
            bsSize="sm"
            onClick={() => onChange({ color, alpha: 1 })}
          />
        ) : (
          <IconButton
            icon="eye-open"
            bsStyle="link"
            bsSize="sm"
            onClick={() => onChange({ color, alpha: 0 })}
          />
        )}
        <Slider
          className="opacity-slider"
          min={0}
          max={100}
          step={10}
          value={alpha * 100}
          onChange={(v: number) => onChange({ color, alpha: v / 100 })}
        />
      </div>
    </div>
  );
};
