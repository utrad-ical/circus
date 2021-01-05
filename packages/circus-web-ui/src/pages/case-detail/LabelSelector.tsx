import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import classNames from 'classnames';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import { Button } from 'components/react-bootstrap';
import { Modal } from 'components/react-bootstrap';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { mostReadable } from 'tinycolor2';
import Series from 'types/Series';
import { EditingData, EditingDataUpdater } from './revisionData';
import { InternalLabel, labelTypes } from './labelData';
import { multirange } from 'multi-integer-range';
import { newViewerCellItem, performLayout } from './caseStore';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';

const LabelSelector: React.FC<{
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  seriesData: { [seriesUid: string]: Series };
  volumeLoadedStatus: boolean[];
  disabled?: boolean;
}> = props => {
  const {
    editingData,
    updateEditingData,
    seriesData,
    volumeLoadedStatus,
    disabled
  } = props;

  const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];
  const activeLabel =
    activeLabelIndex >= 0 ? activeSeries.labels[activeLabelIndex] : null;

  return (
    <StyledSeriesUl>
      {revision.series.map((series, seriesIndex) => (
        <SeriesItem
          key={`${seriesIndex}:${series.seriesUid}`}
          seriesInfo={seriesData[series.seriesUid]}
          volumeLoaded={volumeLoadedStatus[seriesIndex]}
          editingData={editingData}
          updateEditingData={updateEditingData}
          seriesIndex={seriesIndex}
          activeLabel={activeLabel}
          disabled={disabled}
        />
      ))}
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
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  seriesInfo: Series;
  volumeLoaded: boolean;
  seriesIndex: number;
  activeLabel: InternalLabel | null;
  disabled?: boolean;
}> = props => {
  const {
    seriesIndex,
    editingData,
    updateEditingData,
    seriesInfo,
    volumeLoaded,
    activeLabel,
    disabled
  } = props;
  const series = editingData.revision.series[seriesIndex];

  const changeLabel = (seriesIndex: number, labelIndex: number) => {
    if (
      editingData.activeSeriesIndex !== seriesIndex ||
      editingData.activeLabelIndex !== labelIndex
    ) {
      updateEditingData(editingData => {
        if (editingData.activeSeriesIndex !== seriesIndex) {
          const viewerKeys = editingData.layoutItems.filter(
            item => item.seriesIndex === seriesIndex
          );
          editingData.activeLayoutKey = viewerKeys[0]
            ? viewerKeys[0].key
            : null;
        }
        editingData.activeSeriesIndex = seriesIndex;
        editingData.activeLabelIndex = labelIndex;
      }, 'Change active series');
    }
  };

  const handleSeriesClick = () => {
    // Change active series and select the first labe if exists
    if (disabled) return;
    if (editingData.activeSeriesIndex === seriesIndex) return;
    changeLabel(seriesIndex, series.labels.length ? 0 : -1);
  };

  const handleSeriesDoubleClick = () => {
    if (disabled) return;
    if (editingData.activeSeriesIndex !== seriesIndex) return;
    const [layoutItems, layout] = performLayout('twoByTwo', seriesIndex);
    updateEditingData(d => {
      d.layoutItems = layoutItems;
      d.layout = layout;
      d.activeLayoutKey = layoutItems[0].key;
    }, 'layout');
  };

  const handleLabelClick = (labelIndex: number) => {
    changeLabel(seriesIndex, labelIndex);
  };

  const handleDragStart = (ev: React.DragEvent) => {
    const item = newViewerCellItem(seriesIndex, 'axial');
    updateEditingData(d => {
      d.layoutItems.push(item);
    }, 'layout');
    ev.dataTransfer.setData('text/x-circusdb-viewergrid', item.key);
    ev.dataTransfer.effectAllowed = 'move';
    ev.stopPropagation();
  };

  return (
    <StyledSeriesLi
      className={classNames({
        active: seriesIndex === editingData.activeSeriesIndex
      })}
      onClick={handleSeriesClick}
      onDoubleClick={handleSeriesDoubleClick}
      onDragStart={handleDragStart}
      draggable
    >
      <span className="series-head">
        <div>
          <Icon icon="circus-series" /> Series #{seriesIndex}
          {!volumeLoaded && (
            <span className="series-loading">
              <LoadingIndicator delay={300} /> loading...
            </span>
          )}
        </div>
        <div onClick={ev => ev.stopPropagation()}>
          <SeriesInfo
            series={seriesInfo}
            pvd={series.partialVolumeDescriptor}
          />
        </div>
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
            onClick={handleLabelClick}
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
  .series-head {
    display: flex;
    justify-content: space-between;
  }
  .series-head .circus-icon {
    font-size: 130%;
  }
  &.active .series-head {
    font-weight: bold;
  }
  .series-loading {
    padding-left: 15px;
    color: gray;
    font-weight: normal;
  }
`;

////////////////////////////////////////////////////////////////////////////////

const SeriesInfo: React.FC<{
  series: Series;
  pvd: PartialVolumeDescriptor;
}> = React.memo(props => {
  const { series, pvd } = props;
  const [showModal, setShowModal] = useState(false);

  const mr = multirange(series.images);
  const noPvd =
    !pvd || (mr.min() === pvd.start && mr.max() === pvd.end && pvd.delta === 1);

  const data: { [key: string]: React.ReactChild } = {
    Modality: series.modality,
    'Series Description': series.seriesDescription,
    'Width / Height': `${series.width} / ${series.height}`,
    Images: (
      <>
        {series.images}
        {noPvd ? (
          <> (Full)</>
        ) : (
          <>
            {' '}
            (<b>Partial:</b> {describePartialVolumeDescriptor(pvd)})
          </>
        )}
      </>
    ),
    'Series Instance UID': series.seriesUid,
    'Study Instance UID': series.studyUid,
    'Series Date': series.seriesDate,
    Model: `${series.modelName} (${series.manufacturer})`
  };

  return (
    <div>
      <IconButton
        bsStyle="link"
        icon="glyphicon-info-sign"
        onClick={() => setShowModal(true)}
      />
      <Modal show={showModal} onHide={() => setShowModal(false)} bsSize="lg">
        <Modal.Header closeButton>Series Information</Modal.Header>
        <table className="table table-striped">
          <tbody>
            {Object.keys(data).map(k => (
              <tr key={k}>
                <th>{k}</th>
                <td>{data[k]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Modal.Footer>
          <Button bsStyle="primary" onClick={() => setShowModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
});

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
  onClick: (labelIndex: number) => void;
}> = props => {
  const {
    label,
    seriesIndex,
    labelIndex,
    activeLabel,
    updateEditingData,
    disabled,
    onClick
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
    onClick(labelIndex);
  };

  const handleDragStart = (ev: React.DragEvent) => {
    ev.dataTransfer.setData('text/x-circusdb-label', '');
    dragData = { seriesIndex, labelIndex };
    ev.dataTransfer.effectAllowed = 'move';
    ev.stopPropagation();
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
      onDoubleClick={(ev: React.MouseEvent) => ev.stopPropagation()}
      draggable
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div
        className="color-preview"
        onClick={handleColorPreviewClick}
        style={{
          backgroundColor: label.data.color,
          color: mostReadable(label.data.color, [
            '#000000',
            '#ffffff'
          ]).toHexString()
        }}
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
