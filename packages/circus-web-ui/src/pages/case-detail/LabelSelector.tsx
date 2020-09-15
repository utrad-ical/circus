import classNames from 'classnames';
import Icon from 'components/Icon';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import {
  EditingData,
  EditingDataUpdater,
  InternalLabel,
  labelTypes,
  SeriesEntryWithLabels
} from './revisionData';

const LabelSelector: React.FC<{
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  disabled?: boolean;
}> = props => {
  const { editingData, updateEditingData, disabled } = props;

  const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];
  const activeLabel =
    activeLabelIndex >= 0 ? activeSeries.labels[activeLabelIndex] : null;

  return (
    <StyledSeriesUl>
      {revision.series.map(
        (series: SeriesEntryWithLabels, seriesIndex: number) => (
          <SeriesItem
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
  );
};

const StyledSeriesUl = styled.ul`
  padding: 0;
  border-top: 1px solid silver;

  ul.case-label-list {
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
`;

export default LabelSelector;

////////////////////////////////////////////////////////////////////////////////

const SeriesItem: React.FC<{
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
    // Change active series and select the first labe if exists
    if (disabled) return;
    updateEditingData(editingData => {
      if (editingData.activeSeriesIndex !== seriesIndex) {
        editingData.activeSeriesIndex = seriesIndex;
        editingData.activeLabelIndex = series.labels.length ? 0 : -1;
      }
    }, 'Change active label');
  };

  return (
    <StyledSeriesLi
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
        {!series.labels.length && <li className="no-labels">No labels</li>}
      </ul>
    </StyledSeriesLi>
  );
};

const StyledSeriesLi = styled.li`
  cursor: pointer;
  margin-top: 10px;
  padding-left: 10px;
  list-style-type: none;
  .series-head .circus-icon {
    font-size: 130%;
  }
  &.active .series-head {
    font-weight: bold;
  }
`;

////////////////////////////////////////////////////////////////////////////////

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
    seriesIndex,
    labelIndex,
    activeLabel,
    updateEditingData,
    disabled
  } = props;

  const [isDraggingOver, setIsDragingOver] = useState<false | 'top' | 'bottom'>(
    false
  );
  const liRef = useRef<HTMLLIElement>(null);

  const handleColorPreviewClick = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (disabled) return;
    updateEditingData(editingData => {
      const label = editingData.revision.series[seriesIndex].labels[labelIndex];
      label.hidden = !label.hidden;
    }, 'Label visibility ' + label.temporaryKey);
  };

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
      return; // will not accept this drag

    const li = ev.target as HTMLLIElement;
    const rect = li.getBoundingClientRect();
    const y = ev.clientY - rect.top; // y position within the element
    if (y < li.clientHeight / 2) {
      if (labelIndex === dragData.labelIndex + 1) return;
      setIsDragingOver('top');
    } else {
      if (labelIndex === dragData.labelIndex - 1) return;
      setIsDragingOver('bottom');
    }
    ev.preventDefault(); // accept drag
  };

  const handleDragLeave = (ev: React.DragEvent) => {
    setIsDragingOver(false);
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
      const insertIndex = labelIndex + (isDraggingOver === 'top' ? 0 : 1);
      const draggingUp = labelIndex <= dragData.labelIndex;
      series.labels.splice(insertIndex, 0, label);
      series.labels.splice(dragData.labelIndex + (draggingUp ? 1 : 0), 1);
      d.activeLabelIndex = insertIndex + (draggingUp ? 0 : -1);
    });
    setIsDragingOver(false);
  };

  return (
    <StyledLabelLi
      ref={liRef}
      className={classNames({
        active: label === activeLabel,
        'dragging-top': isDraggingOver === 'top',
        'dragging-bottom': isDraggingOver === 'bottom'
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
        onClick={handleColorPreviewClick}
        style={{ backgroundColor: label.data.color }}
      >
        {label.hidden && <Icon icon="eye-close" />}
      </div>
      <div className="caption">
        <Icon icon={labelTypes[label.type].icon} />
        &nbsp;
        {label.name ?? <span className="no-name">Label</span>}
      </div>
    </StyledLabelLi>
  );
};

const StyledLabelLi = styled.li`
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 3px 0px 3px 10px;
  border-bottom: 1px solid silver;
  .color-preview {
    display: block;
    flex: 0 0 25px;
    height: 20px;
    text-align: center;
    border: 1px solid silver;
  }
  .caption {
    pointer-events: none; /* Needed for drag & drop */
    .circus-icon {
      font-size: 130%;
    }
    flex-grow: 1;
    margin-left: 15px;
    overflow: hidden;
    .no-name {
      color: gray;
    }
  }
  &:hover {
    background-color: #eeeeee;
  }
  &.active {
    background-color: silver;
    font-weight: bold;
  }
  &.dragging-top {
    border-top: 3px solid gray;
  }
  &.dragging-bottom {
    border-bottom: 3px solid gray;
  }
`;
