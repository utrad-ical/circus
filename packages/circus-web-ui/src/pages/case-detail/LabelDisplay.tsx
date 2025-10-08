import Icon from 'components/Icon';
import React, { DragEventHandler, MouseEventHandler, useMemo } from 'react';
import styled from 'styled-components';
import { mostReadable } from 'tinycolor2';
import { InternalLabel, labelTypes } from './labelData';

const LabelDisplay: React.FC<{
  label: InternalLabel;
  visibility?: 'normal' | 'hidden' | 'allHidden';
  hintText?: string;
  onColorClick?: MouseEventHandler;
  colorDraggable?: boolean;
  onColorDragStart?: DragEventHandler;
  onColorDragOver?: DragEventHandler;
  onColorDragEnd?: DragEventHandler;
}> = props => {
  const {
    label,
    hintText,
    visibility = 'normal',
    onColorClick,
    colorDraggable,
    onColorDragStart,
    onColorDragOver,
    onColorDragEnd
  } = props;

  const iconColor = useMemo(
    () => mostReadable(label.data.color, ['#000000', '#ffffff']).toHexString(),
    [label.data.color]
  );

  return (
    <StyledLabelDiv className="circus-label">
      <div
        className="color-preview"
        onClick={onColorClick}
        draggable={colorDraggable}
        onDragStart={onColorDragStart}
        onDragOver={onColorDragOver}
        onDragEnd={onColorDragEnd}
        style={{ backgroundColor: label.data.color, color: iconColor }}
      >
        {visibility === 'allHidden' ? (
          <Icon icon="material-cancel" />
        ) : visibility === 'hidden' ? (
          <Icon icon="material-visibility_off" />
        ) : null}
      </div>
      <div className="caption">
        <Icon icon={labelTypes[label.type].icon} />
        {label.name ?? <span className="no-name">Label</span>}
        {hintText && (
          <span className="hint" title={hintText}>
            {hintText}
          </span>
        )}
      </div>
    </StyledLabelDiv>
  );
};

export default LabelDisplay;

const StyledLabelDiv = styled.div`
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  > .color-preview {
    width: 25px;
    min-width: 25px;
    display: block;
    height: 20px;
    text-align: center;
    border: 1px solid var(--circus-border);
  }
  > .caption {
    white-space: nowrap;
    flex-grow: 1;
    display: flex;
    gap: 10px;
    align-items: center;
    > .circus-icon {
      font-size: 130%;
    }
    .no-name {
      color: gray;
    }
    .hint {
      opacity: 0.7;
      font-size: 80%;
    }
  }
`;
