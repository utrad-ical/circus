import React from 'react';
import ColorPicker from 'rb/ColorPicker';
import { Popover, Button, OverlayTrigger } from 'components/react-bootstrap';
import classNames from 'classnames';
import { confirm } from 'rb/modal';
import IconButton from 'components/IconButton';
import Icon from 'components/Icon';
import Slider from 'rb/Slider';
import update from 'immutability-helper';

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
    editingData,
    onChange,
    onChangeActiveLabel,
    activeLabel,
    activeSeries
  } = props;
  const { revision } = editingData;

  const handleChangeSeries = (index, newSeries, pushToHistory = false) => {
    const newEditingData = update(editingData, {
      revision: { series: { [index]: { $set: newSeries } } }
    });
    onChange(newEditingData, pushToHistory);
  };

  return (
    <ul className="case-series-list">
      {revision.series.map((series, seriesIndex) => (
        <Series
          series={series}
          index={seriesIndex}
          key={series.seriesUid}
          onChange={handleChangeSeries}
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

  const handleLabelChange = (labelIndex, label, pushToHistory = false) => {
    const newSeries = update(series, {
      labels: { [labelIndex]: { $set: label } }
    });
    onChange(seriesIndex, newSeries, pushToHistory);
  };

  const addLabel = () => {
    const newLabel = {
      type: 'voxel',
      data: {
        origin: [0, 0, 0],
        size: [16, 16, 16],
        color: '#ff0000',
        alpha: 1,
        voxels: null,
        volumeArrayBuffer: new ArrayBuffer(16 * 16 * 16 / 8)
      },
      attributes: {}
    };
    const newSeries = update(series, { labels: { $push: [newLabel] } });
    onChange(seriesIndex, newSeries, true);
  };

  async function removeLabel(labelIndex) {
    if (!await confirm('Delete this label?')) return;
    const newSeries = update(series, {
      labels: { $splice: [[labelIndex, 1]] } // remove one item from labels
    });
    onChange(seriesIndex, newSeries, true);
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
            onChange={handleLabelChange}
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

  const changeLabelAlpha = alpha => {
    const newLabel = update(label, { data: { alpha: { $set: alpha } } });
    onChange(labelIndex, newLabel);
  };

  const handleChangeLabelColor = color => {
    const newLabel = update(label, { data: { color: { $set: color } } });
    onChange(labelIndex, newLabel);
  };

  const commitLabelChange = open => {
    if (open) return;
    onChange(labelIndex, label, true);
  };

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
        <OpacityEditor value={label.data.alpha} onChange={changeLabelAlpha} />
        <ColorPicker
          bsSize="xs"
          value={label.data.color}
          colors={labelColors}
          onChange={handleChangeLabelColor}
          onToggle={commitLabelChange}
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
      <Slider
        className="opacity-slider"
        min={0}
        max={100}
        step={10}
        value={value * 100}
        onChange={v => props.onChange(v / 100)}
      />
    </div>
  );
};
