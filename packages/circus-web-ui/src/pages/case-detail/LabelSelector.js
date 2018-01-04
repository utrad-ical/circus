import React from 'react';
import ColorPicker from 'rb/ColorPicker';
import {
  Popover,
  Button,
  OverlayTrigger,
  FormControl
} from '../../components/react-bootstrap';
import { RawData, PixelFormat, VoxelCloud } from 'circus-rs';
import classNames from 'classnames';
import { confirm } from 'rb/modal';
import IconButton from 'components/IconButton';
import Icon from 'components/Icon';

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

const LabelSelector = props => {
  const {
    revision,
    onChange,
    onChangeActiveLabel,
    activeLabel,
    activeSeries
  } = props;

  function changeSeries(index, newSeries) {
    const newRev = {
      ...revision,
      series: [...revision.series]
    };
    newRev.series[index] = newSeries;
    onChange(newRev);
  }

  return (
    <ul className="case-series-list">
      {revision.series.map((series, seriesIndex) => (
        <Series
          series={series}
          index={seriesIndex}
          key={series.seriesUid}
          onChange={changeSeries}
          onChangeActiveLabel={onChangeActiveLabel}
          activeSeries={activeSeries}
          activeLabel={activeLabel}
        />
      ))}
    </ul>
  );
};

export default LabelSelector;

const Series = props => {
  const {
    index: seriesIndex,
    series,
    activeSeries,
    activeLabel,
    onChange,
    onChangeActiveLabel
  } = props;

  function changeLabel(labelIndex, label) {
    const newSeries = {
      ...series,
      labels: [...series.labels]
    };
    newSeries.labels[labelIndex] = label;
    onChange(seriesIndex, newSeries);
  }

  function addLabel() {
    const cloud = new VoxelCloud();
    cloud.color = '#ff0000';
    cloud.alpha = 1;
    cloud.origin = [0, 0, 0];
    cloud.volume = new RawData([16, 16, 16], PixelFormat.Binary);
    const newLabel = {
      type: 'voxel',
      data: {}, // will be filled just before actual save
      attributes: [],
      cloud // cloud is the primary data storage while editing
    };
    const newSeries = {
      ...series,
      labels: [...series.labels, newLabel]
    };
    onChange(seriesIndex, newSeries);
  }

  async function removeLabel(labelIndex) {
    if (!await confirm('Delete this label?')) return;
    const newSeries = {
      ...series,
      labels: series.labels.filter((l, i) => labelIndex !== i)
    };
    onChange(seriesIndex, newSeries);
  }

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
            label={label}
            activeLabel={activeLabel}
            index={labelIndex}
            key={labelIndex}
            onChange={changeLabel}
            onClick={() => onChangeActiveLabel(seriesIndex, labelIndex)}
            onRemoveClick={() => removeLabel(labelIndex)}
          />
        ))}
      </ul>
      <div className="case-label-buttons">
        <IconButton icon="plus" bsSize="xs" onClick={addLabel}>
          Add Label
        </IconButton>
      </div>
    </li>
  );
};

export const Label = props => {
  const {
    label,
    index: labelIndex,
    activeLabel,
    onChange,
    onClick,
    onRemoveClick
  } = props;
  const caption = label.title ? label.title : `Label #${props.index}`;

  function changeLabelAlpha(alpha) {
    label.cloud.alpha = alpha;
    onChange(labelIndex, label);
  }

  function changeLabelColor(color) {
    label.cloud.color = color;
    onChange(labelIndex, label);
  }

  // console.log(`Cloud #${labelIndex}`, label.cloud);

  return (
    <li
      className={classNames('label-list-item', {
        active: label === activeLabel
      })}
      onClick={onClick}
    >
      <div>
        <Icon icon="tag" /> {caption}
      </div>
      <div>
        <OpacityEditor value={label.cloud.alpha} onChange={changeLabelAlpha} />
        <ColorPicker
          bsSize="xs"
          value={label.cloud.color}
          colors={labelColors}
          onChange={changeLabelColor}
        />
        <IconButton icon="remove" bsSize="xs" onClick={onRemoveClick} />
      </div>
    </li>
  );
};

const OpacityEditor = props => {
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
    >
      <Button bsStyle="default" bsSize="xs">
        {props.value * 100}%
      </Button>
    </OverlayTrigger>
  );
};

const OpacityPopover = props => {
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
      <FormControl
        type="number"
        step={10}
        min={0}
        max={100}
        bsSize="sm"
        value={value * 100}
        onChange={ev => props.onChange(ev.target.value / 100)}
      />
    </div>
  );
};
