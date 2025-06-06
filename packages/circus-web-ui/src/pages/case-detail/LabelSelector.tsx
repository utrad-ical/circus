import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import classNames from 'classnames';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import { Button, Modal } from 'components/react-bootstrap';
import { multirange } from 'multi-integer-range';
import React, { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import Series from 'types/Series';
import { newViewerCellItem, performLayout } from './caseStore';
import { InternalLabel } from './labelData';
import LabelDisplay from './LabelDisplay';
import { EditingData, EditingDataUpdater, seriesColors } from './revisionData';
import { ViewerMode } from './ViewerGrid';

const LabelSelector: React.FC<{
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  seriesData: { [seriesUid: string]: Series };
  volumeLoadingProgresses: number[];
  disabled?: boolean;
  multipleSeriesShown: boolean;
  metadata: (DicomVolumeMetadata | undefined)[];
}> = props => {
  const {
    editingData,
    updateEditingData,
    seriesData,
    volumeLoadingProgresses,
    disabled,
    multipleSeriesShown,
    metadata
  } = props;

  const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];
  const activeLabel =
    activeLabelIndex >= 0 ? activeSeries.labels[activeLabelIndex] : null;
  const activeSeriesMetadata = metadata[activeSeriesIndex];

  return (
    <StyledSeriesUl>
      {revision.series.map((series, seriesIndex) => (
        <SeriesItem
          key={`${seriesIndex}:${series.seriesUid}`}
          seriesInfo={seriesData[series.seriesUid]}
          volumeLoadingProgress={volumeLoadingProgresses[seriesIndex]}
          editingData={editingData}
          updateEditingData={updateEditingData}
          seriesIndex={seriesIndex}
          activeLabel={activeLabel}
          disabled={disabled}
          multipleSeriesShown={multipleSeriesShown}
          metadata={activeSeriesMetadata}
        />
      ))}
    </StyledSeriesUl>
  );
};

const StyledSeriesUl = styled.ul`
  padding: 0;
  border-top: 1px solid ${(props: any) => props.theme.border};

  ul.case-label-list {
    margin: 0;
    padding-left: 10px;
    &.active {
      background-color: ${(props: any) => props.theme.activeBackground};
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
  volumeLoadingProgress: number;
  seriesIndex: number;
  activeLabel: InternalLabel | null;
  disabled?: boolean;
  multipleSeriesShown: boolean;
  metadata: DicomVolumeMetadata | undefined;
}> = props => {
  const {
    seriesIndex,
    editingData,
    updateEditingData,
    seriesInfo,
    volumeLoadingProgress,
    activeLabel,
    disabled,
    multipleSeriesShown,
    metadata
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
    if (!metadata) return;
    const layoutKind = metadata.mode !== '3d' ? '2d' : 'twoByTwo';
    const [layoutItems, layout] = performLayout(layoutKind, seriesIndex);
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
    if (!metadata) {
      throw new Error('No metadata available.');
    }
    const mode: ViewerMode = metadata.mode;
    const item = newViewerCellItem(seriesIndex, mode, 'axial');
    updateEditingData(d => {
      d.layoutItems.push(item);
    }, 'layout');
    ev.dataTransfer.setData('text/x-circusdb-viewergrid', item.key);
    ev.dataTransfer.effectAllowed = 'move';
    ev.stopPropagation();
  };

  const shown = Object.keys(editingData.layout.positions).some(
    key =>
      editingData.layoutItems.find(item => item.key === key)!.seriesIndex ===
      seriesIndex
  );
  const color = multipleSeriesShown
    ? seriesColors[Math.min(seriesIndex, seriesColors.length - 1)]
    : '#000000';

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
          <Icon icon="circus-series" />
          {shown && <div className="box" style={{ backgroundColor: color }} />}
          Series #{seriesIndex}
          {volumeLoadingProgress < 1 && (
            <span className="series-loading">
              <LoadingIndicator delay={300} /> loading...
              {(volumeLoadingProgress * 100).toFixed(1)}%
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
            editingData={editingData}
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
  .box {
    display: inline-box;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    margin-right: 5px;
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
        icon="material-info"
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
let isDraggingColorPreview: false | 'hidden' | 'apparent' = false;

export const Label: React.FC<{
  label: InternalLabel;
  labelIndex: number;
  seriesIndex: number;
  activeLabel: InternalLabel | null;
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  disabled?: boolean;
  onClick: (labelIndex: number) => void;
}> = props => {
  const {
    label,
    seriesIndex,
    labelIndex,
    activeLabel,
    editingData,
    updateEditingData,
    disabled,
    onClick
  } = props;

  const [isDraggingOver, setIsDraggingOver] = useState<
    false | 'top' | 'bottom'
  >(false);
  const liRef = useRef<HTMLLIElement>(null);

  const handleColorPreviewClick = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (disabled) return;
    updateEditingData(editingData => {
      const label = editingData.revision.series[seriesIndex].labels[labelIndex];
      label.hidden = !label.hidden;
      editingData.allLabelsHidden = false;
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
      setIsDraggingOver('top');
    } else {
      if (labelIndex === dragData.labelIndex - 1) return;
      setIsDraggingOver('bottom');
    }
    ev.preventDefault(); // accept drag
  };

  const handleDragLeave = (ev: React.DragEvent) => {
    setIsDraggingOver(false);
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
    setIsDraggingOver(false);
  };

  const handleDragStartColorPreview = (ev: React.DragEvent) => {
    if (
      isDraggingColorPreview ||
      0 <= ev.dataTransfer.types.indexOf('text/x-circusdb-label')
    ) {
      return;
    }
    ev.dataTransfer.setData('text/x-circusdb-color-preview', '');
    const emptyImg = document.createElement('canvas');
    ev.dataTransfer.setDragImage(emptyImg, 0, 0);
    updateEditingData(editingData => {
      const label = editingData.revision.series[seriesIndex].labels[labelIndex];
      const hidden = !label.hidden;
      isDraggingColorPreview = hidden ? 'hidden' : 'apparent';
      label.hidden = hidden;
      editingData.allLabelsHidden = false;
    }, 'Label visibility ' + label.temporaryKey);
    ev.stopPropagation();
  };

  const handleDragOverColorPreview = (ev: React.DragEvent) => {
    if (
      !isDraggingColorPreview ||
      (editingData.revision.series[seriesIndex].labels[labelIndex].hidden
        ? isDraggingColorPreview === 'hidden'
        : isDraggingColorPreview === 'apparent')
    )
      return;

    ev.preventDefault();
    updateEditingData(editingData => {
      const label = editingData.revision.series[seriesIndex].labels[labelIndex];
      isDraggingColorPreview === 'hidden'
        ? (label.hidden = true)
        : (label.hidden = false);
      editingData.allLabelsHidden = false;
    }, 'Label visibility ' + label.temporaryKey);
  };

  const handleDragEndColorPreview = (ev: React.DragEvent) => {
    ev.preventDefault();
    isDraggingColorPreview = false;
  };

  const hint = useMemo(() => {
    switch (label.type) {
      case 'ellipse':
      case 'rectangle': {
        const xs = Math.abs(label.data.max[0] - label.data.min[0]).toFixed(1);
        const ys = Math.abs(label.data.max[1] - label.data.min[1]).toFixed(1);
        return `${xs} x ${ys}`;
      }
      case 'cuboid':
      case 'ellipsoid': {
        const xs = Math.abs(label.data.max[0] - label.data.min[0]).toFixed(1);
        const ys = Math.abs(label.data.max[1] - label.data.min[1]).toFixed(1);
        const zs = Math.abs(label.data.max[2] - label.data.min[2]).toFixed(1);
        return `${xs} x ${ys} x ${zs}`;
      }
      case 'point': {
        const x = label.data.location[0].toFixed(1);
        const y = label.data.location[1].toFixed(1);
        const z = label.data.location[2].toFixed(1);
        return `(${x}, ${y}, ${z})`;
      }
      case 'ruler': {
        const xs = label.data.start[0] - label.data.end[0];
        const ys = label.data.start[1] - label.data.end[1];
        const zs = label.data.start[2] - label.data.end[2];
        return `${Math.sqrt(xs * xs + ys * ys + zs * zs).toFixed(1)} mm`;
      }
    }
  }, [label]);

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
      <LabelDisplay
        label={label}
        onColorClick={handleColorPreviewClick}
        colorDraggable
        onColorDragStart={handleDragStartColorPreview}
        onColorDragOver={handleDragOverColorPreview}
        onColorDragEnd={handleDragEndColorPreview}
        visibility={
          editingData.allLabelsHidden
            ? 'allHidden'
            : label.hidden
              ? 'hidden'
              : 'normal'
        }
        hintText={hint}
      />
    </StyledLabelLi>
  );
};

const StyledLabelLi = styled.li`
  list-style-type: none;
  border-bottom: 1px solid ${(props: any) => props.theme.border};
  height: 30px;
  > .circus-label {
    width: 100%;
    overflow: hidden;
  }
  &:hover {
    background-color: ${(props: any) => props.theme.secondaryBackground};
  }
  &.active {
    background-color: ${(props: any) => props.theme.activeBackground};
    font-weight: bold;
    .hint {
      color: white;
    }
  }
  &.dragging-top {
    border-top: 3px solid gray;
  }
  &.dragging-bottom {
    border-bottom: 3px solid gray;
  }
`;
