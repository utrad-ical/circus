import ColorPicker from '@smikitky/rb-components/lib/ColorPicker';
import { confirm } from '@smikitky/rb-components/lib/modal';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import Slider from '@smikitky/rb-components/lib/Slider';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import {
  Composition,
  getBoxCenter,
  PlaneFigure,
  Viewer,
  VoxelCloud
} from '@utrad-ical/circus-rs/src/browser';
import focusBy from '@utrad-ical/circus-rs/src/browser/tool/state/focusBy';
import classNames from 'classnames';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import {
  Button,
  DropdownButton,
  MenuItem,
  OverlayTrigger,
  Popover
} from 'components/react-bootstrap';
import update from 'immutability-helper';
import produce from 'immer';
import React, { Fragment, useLayoutEffect, useState } from 'react';
import styled from 'styled-components';
import useLocalPreference from 'utils/useLocalPreference';
import {
  createDefaultPlaneFigureLabelData,
  createDefaultSolidFigureLabelData,
  createEmptyVoxelLabelData,
  LabelEntry,
  LabelType,
  PlaneFigureLabel,
  SeriesEntry,
  SolidFigureLabel,
  VoxelLabel,
  voxelShrinkToMinimum
} from './revisionData';

const labelTypeOptions: { [key: string]: { caption: string; icon: string } } = {
  voxel: { caption: 'voxel', icon: 'circus-annotation-voxel' },
  cuboid: { caption: 'cuboid', icon: 'circus-annotation-cuboid' },
  ellipsoid: { caption: 'ellipsoid', icon: 'circus-annotation-ellipsoid' },
  rectangle: { caption: 'rectangle', icon: 'circus-annotation-rectangle' },
  ellipse: { caption: 'ellipse', icon: 'circus-annotation-ellipse' }
};

const convertLabelTypeMenuOptions: {
  [type: string]: {
    convertTo: LabelType;
    caption: string;
    icon: string;
  };
} = {
  cuboid: {
    convertTo: 'ellipsoid',
    caption: 'Convert to ellipsoid',
    icon: 'circus-annotation-ellipsoid'
  },
  ellipsoid: {
    convertTo: 'cuboid',
    caption: 'Convert to cuboid',
    icon: 'circus-annotation-cuboid'
  },
  rectangle: {
    convertTo: 'ellipse',
    caption: 'Convert to ellipse',
    icon: 'circus-annotation-ellipse'
  },
  ellipse: {
    convertTo: 'rectangle',
    caption: 'Convert to rectangle',
    icon: 'circus-annotation-rectangle'
  }
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

const LabelSelector: React.FC<{
  editingData: any;
  composition: Composition;
  onChange: (newEditingData: any, pushToHistory: boolean) => void;
  onChangeActiveLabel: (seriesIndex: number, labelIndex: number) => void;
  activeLabel: LabelEntry;
  activeSeries: SeriesEntry;
  viewers: { [index: string]: Viewer };
}> = props => {
  const {
    editingData,
    composition,
    onChange,
    onChangeActiveLabel,
    activeLabel,
    activeSeries,
    viewers
  } = props;
  const { revision } = editingData;

  const handleChangeSeries = (
    index: number,
    newSeries: SeriesEntry,
    pushToHistory: boolean = false
  ) => {
    const newEditingData = update(editingData, {
      revision: { series: { [index]: { $set: newSeries } } }
    });
    onChange(newEditingData, pushToHistory);
  };

  return (
    <ul className="case-series-list">
      {revision.series.map((series: SeriesEntry, seriesIndex: number) => (
        <Series
          composition={composition}
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
  );
};

export default LabelSelector;

const Series: React.FC<{
  composition: Composition;
  index: number;
  series: SeriesEntry;
  activeSeries: SeriesEntry;
  activeLabel: LabelEntry;
  onChange: (
    seriesIndex: number,
    newSeries: SeriesEntry,
    pushToHistory: boolean
  ) => void;
  onChangeActiveLabel: (seriesIndex: number, labelIndex: number) => void;
  viewers: { [index: string]: Viewer };
}> = props => {
  const {
    composition,
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

  const [changeActiveLabelKey, setChangeActiveLabelKey] = useState<
    string | undefined
  >(undefined);

  useLayoutEffect(() => {
    if (changeActiveLabelKey !== undefined) {
      const newActiveLabelIndex = series.labels.findIndex(
        v => v.temporarykey === changeActiveLabelKey
      );
      onChangeActiveLabel(seriesIndex, newActiveLabelIndex);
    }
    setChangeActiveLabelKey(undefined);
  }, [
    setChangeActiveLabelKey,
    onChangeActiveLabel,
    seriesIndex,
    changeActiveLabelKey,
    series.labels
  ]);

  const handleLabelChange = (
    labelIndex: number,
    label: LabelEntry,
    pushToHistory: boolean = false
  ) => {
    const newSeries = update(series, {
      labels: { [labelIndex]: { $set: label } }
    });
    onChange(seriesIndex, newSeries, pushToHistory);
  };

  const getUniqueLabelName = (name: string) => {
    const existsName = (name: string) => {
      return activeSeries.labels.some(
        label => label.name && label.name === name
      );
    };
    if (!existsName(name)) {
      return name;
    }
    for (let index = 2; ; index++) {
      const newName = name + ' ' + index;
      if (!existsName(newName)) {
        return newName;
      }
    }
  };

  const createNewLabel = (): LabelEntry => {
    const color = '#ff0000';
    const alpha = 1;
    const temporarykey = generateUniqueId();

    const createNewVoxelLabel = (): VoxelLabel => {
      return {
        temporarykey: temporarykey,
        type: newLabelType,
        name: getUniqueLabelName('Voxels'),
        data: {
          ...createEmptyVoxelLabelData(),
          color: color,
          alpha: alpha
        },
        attributes: {}
      };
    };

    const createNewSolidFigureLabel = (): SolidFigureLabel => {
      return {
        temporarykey: temporarykey,
        type: newLabelType,
        name: getUniqueLabelName('3D Shape'),
        data: {
          ...createDefaultSolidFigureLabelData(viewers),
          color: color,
          alpha: alpha
        },
        attributes: {}
      };
    };

    const createNewPlaneFigureLabel = (): PlaneFigureLabel => {
      return {
        temporarykey: temporarykey,
        type: newLabelType,
        name: getUniqueLabelName('2D Shape'),
        data: {
          ...createDefaultPlaneFigureLabelData(viewers),
          color: color,
          alpha: alpha
        },
        attributes: {}
      };
    };

    switch (newLabelType) {
      case 'cuboid':
      case 'ellipsoid':
        return createNewSolidFigureLabel();

      case 'rectangle':
      case 'ellipse':
        return createNewPlaneFigureLabel();

      case 'voxel':
      default:
        return createNewVoxelLabel();
    }
  };

  const addLabel = () => {
    const newLabel = createNewLabel();
    const newSeries = update(series, { labels: { $push: [newLabel] } });
    onChange(seriesIndex, newSeries, true);
    setChangeActiveLabelKey(newLabel.temporarykey);
  };

  const renameLabel = async (labelIndex: number, label: LabelEntry) => {
    const newLabelName = await prompt('Label name', label.name);
    if (newLabelName === null || label.name === newLabelName) return;
    const newSeries = update(series, {
      labels: {
        [labelIndex]: { name: { $set: newLabelName } }
      }
    });
    onChange(seriesIndex, newSeries, true);
  };

  const removeLabel = async (labelIndex: number) => {
    if (!(await confirm('Delete this label?'))) return;
    const newSeries = update(series, {
      labels: { $splice: [[labelIndex, 1]] }
    });
    onChange(seriesIndex, newSeries, true);
  };

  const moveUpLabel = (labelIndex: number) => {
    if (labelIndex === 0) return;
    const newSeries = produce(series, s => {
      s.labels.splice(
        labelIndex - 1,
        2,
        s.labels[labelIndex],
        s.labels[labelIndex - 1]
      );
    });
    onChange(seriesIndex, newSeries, true);
    setChangeActiveLabelKey(activeLabel.temporarykey);
  };

  const moveDownLabel = (labelIndex: number) => {
    if (labelIndex === series.labels.length - 1) return;
    const newSeries = produce(series, s => {
      s.labels.splice(
        labelIndex,
        2,
        s.labels[labelIndex + 1],
        s.labels[labelIndex]
      );
    });
    onChange(seriesIndex, newSeries, true);
    setChangeActiveLabelKey(activeLabel.temporarykey);
  };

  const convertLabelType = (labelIndex: number, label: LabelEntry) => {
    if (label.type === 'voxel') return;
    const newLabelType = convertLabelTypeMenuOptions[label.type].convertTo;
    const newSeries = update(series, {
      labels: {
        [labelIndex]: { type: { $set: newLabelType } }
      }
    });
    onChange(seriesIndex, newSeries, true);
  };

  const revealInViewer = (label: LabelEntry) => {
    const getVoxelLabelCenter = (
      composition: Composition,
      voxelLabel: VoxelLabel
    ) => {
      const shrinkResult = voxelShrinkToMinimum(voxelLabel.data);
      if (shrinkResult === null) return;
      const origin = shrinkResult.origin;
      const size = shrinkResult.rawData.getDimension();
      return getBoxCenter(
        VoxelCloud.getBoundingBox(composition, { origin, size })
      );
    };

    const getSolidFigureLabelCenter = (solidFigureLabel: SolidFigureLabel) => {
      return getBoxCenter(solidFigureLabel.data);
    };

    const getPlaneFigureLabelCenter = (planeFigureLabel: PlaneFigureLabel) => {
      return getBoxCenter(PlaneFigure.getOutline(planeFigureLabel.data));
    };

    const getCenter = (composition: Composition, label: LabelEntry) => {
      switch (label.type) {
        case 'voxel':
          return getVoxelLabelCenter(composition, label as VoxelLabel);
        case 'cuboid':
        case 'ellipsoid':
          return getSolidFigureLabelCenter(label as SolidFigureLabel);
        case 'rectangle':
        case 'ellipse':
          return getPlaneFigureLabelCenter(label as PlaneFigureLabel);
        default:
          return;
      }
    };

    const center = getCenter(composition, label);
    Object.values(viewers).map(viewer => focusBy(viewer, center));
  };

  return (
    <li
      className={classNames('case-series-list-item', {
        active: series === activeSeries
      })}
    >
      <Icon icon="circus-series" /> Series #{seriesIndex}
      <ul className="case-label-list">
        {series.labels.map((label: LabelEntry, labelIndex: number) => (
          <Label
            label={label}
            labelCount={series.labels.length}
            activeLabel={activeLabel}
            seriesIndex={seriesIndex}
            index={labelIndex}
            key={label.temporarykey!}
            onChange={handleLabelChange}
            onClick={() => onChangeActiveLabel(seriesIndex, labelIndex)}
            onRenameClick={() => renameLabel(labelIndex, label)}
            onRemoveClick={() => removeLabel(labelIndex)}
            onMoveUpClick={() => moveUpLabel(labelIndex)}
            onMoveDownClick={() => moveDownLabel(labelIndex)}
            onConvertTypeClick={() => convertLabelType(labelIndex, label)}
            onRevealInViewerClick={() => revealInViewer(label)}
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
  label: {
    temporarykey?: string;
    type: LabelType;
    data: any;
    name?: string;
  };
  index: number;
  key: string;
  seriesIndex: number;
  activeLabel: LabelEntry;
  labelCount: number;
  onChange: any;
  onClick: any;
  onRenameClick: any;
  onRemoveClick: any;
  onMoveUpClick: any;
  onMoveDownClick: any;
  onConvertTypeClick: any;
  onRevealInViewerClick: any;
}> = props => {
  const {
    label,
    index: labelIndex,
    seriesIndex,
    activeLabel,
    labelCount,
    onChange,
    onClick,
    onRenameClick,
    onRemoveClick,
    onMoveUpClick,
    onMoveDownClick,
    onConvertTypeClick,
    onRevealInViewerClick
  } = props;

  const caption = label.name ? (
    <>{label.name}</>
  ) : (
    <StyledLabelNameNone>Label</StyledLabelNameNone>
  );

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

  const changeLabelAlpha = (alpha: number) => {
    const newLabel = update(label, { data: { alpha: { $set: alpha } } });
    onChange(labelIndex, newLabel);
  };

  const handleChangeLabelColor = (color: string): void => {
    const newLabel = update(label, { data: { color: { $set: color } } });
    onChange(labelIndex, newLabel);
  };

  const handleCommit = (compareKey: string): void => {
    onChange(labelIndex, label, (old: any) => {
      return (
        old.revision.series[seriesIndex].labels[labelIndex].data[compareKey] !==
        label.data[compareKey]
      );
    });
  };

  const handleToggleLabelColor = (open: any) => {
    if (open) return;
    handleCommit('color');
  };

  const handleOpacityCommit = () => {
    handleCommit('alpha');
  };

  const handleClick = (ev: any) => {
    // Ignore click if the click happens with a dropdown
    if (ev.target.closest('.dropdown')) return;
    onClick();
  };

  return (
    <li
      className={classNames('label-list-item', {
        active: label === activeLabel
      })}
      key={label.temporarykey}
      onClick={handleClick}
    >
      <div>
        <Icon icon={labelTypeOptions[label.type].icon} />
        &nbsp;&nbsp;{caption}
      </div>
      <div>
        <OpacityEditor
          value={label.data.alpha}
          onChange={changeLabelAlpha}
          onCommit={handleOpacityCommit}
        />
        <ColorPicker
          bsSize="xs"
          value={label.data.color}
          colors={labelColors}
          onChange={handleChangeLabelColor}
          onToggle={handleToggleLabelColor}
        />
        <DropdownButton
          id="submenu"
          bsStyle="link"
          title={<Icon icon="option-horizontal" />}
          pullRight
          noCaret
        >
          <MenuItem eventKey="1" onSelect={onRenameClick}>
            <Icon icon="header" />
            &ensp;Rename
          </MenuItem>
          <MenuItem eventKey="2" onSelect={onRemoveClick}>
            <Icon icon="remove" />
            &ensp;Remove
          </MenuItem>
          {labelIndex !== 0 && (
            <MenuItem eventKey="3" onSelect={onMoveUpClick}>
              <Icon icon="chevron-up" />
              &ensp;Move up
            </MenuItem>
          )}
          {labelIndex < labelCount - 1 && (
            <MenuItem eventKey="4" onSelect={onMoveDownClick}>
              <Icon icon="chevron-down" />
              &ensp;Move down
            </MenuItem>
          )}
          {label.type !== 'voxel' && (
            <MenuItem eventKey="5" onSelect={onConvertTypeClick}>
              <Icon icon={convertLabelTypeMenuOptions[label.type].icon} />
              &ensp;{convertLabelTypeMenuOptions[label.type].caption}
            </MenuItem>
          )}
          <MenuItem eventKey="6" onSelect={onRevealInViewerClick}>
            <Icon icon="map-marker" />
            &ensp;Reveal in Viewer
          </MenuItem>
        </DropdownButton>
      </div>
    </li>
  );
};

const OpacityEditor: React.FC<{
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}> = props => {
  const { onCommit } = props;

  const opacityEditor = (
    <Popover id="opacity-editor">
      <OpacityPopover {...props} />
    </Popover>
  );
  return (
    <OverlayTrigger
      trigger="click"
      rootClose
      overlay={opacityEditor}
      placement="bottom"
      onExiting={onCommit}
    >
      <Button bsStyle="default" bsSize="xs">
        {props.value * 100}%
      </Button>
    </OverlayTrigger>
  );
};

const OpacityPopover: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = props => {
  const { onChange, value } = props;
  return (
    <div className="label-list-opacity-dropdown">
      {value === 0 ? (
        <IconButton
          icon="eye-close"
          bsStyle="link"
          bsSize="sm"
          onClick={() => onChange(1)}
        />
      ) : (
        <IconButton
          icon="eye-open"
          bsStyle="link"
          bsSize="sm"
          onClick={() => onChange(0)}
        />
      )}
      <Slider
        className="opacity-slider"
        min={0}
        max={100}
        step={10}
        value={value * 100}
        onChange={(v: number) => props.onChange(v / 100)}
      />
    </div>
  );
};
