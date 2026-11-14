import classNames from 'classnames';
import Icon from '#components/Icon.tsx';
import type { DragEventHandler, MouseEventHandler } from 'react';
import React from 'react';
import type { InternalLabel } from './labelData.ts';
import { labelTypes } from './labelData.ts';
import styles from './LabelDisplay.module.css';

const LabelDisplay: React.FC<{
  label: InternalLabel;
  className?: string;
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
    className,
    hintText,
    visibility = 'normal',
    onColorClick,
    colorDraggable,
    onColorDragStart,
    onColorDragOver,
    onColorDragEnd
  } = props;

  return (
    <div className={classNames(styles.labelDisplay, className)}>
      <div
        className={styles.colorPreview}
        onClick={onColorClick}
        draggable={colorDraggable}
        onDragStart={onColorDragStart}
        onDragOver={onColorDragOver}
        onDragEnd={onColorDragEnd}
        style={{
          backgroundColor: label.data.color,
          color: `contrast-color(${label.data.color})`
        }}
      >
        {visibility === 'allHidden' ? (
          <Icon icon="material-cancel" />
        ) : visibility === 'hidden' ? (
          <Icon icon="material-visibility_off" />
        ) : null}
      </div>
      <div className={styles.caption}>
        <Icon icon={labelTypes[label.type].icon} />
        {label.name ?? <span className={styles.noName}>Label</span>}
        {hintText && (
          <span className={styles.hint} title={hintText}>
            {hintText}
          </span>
        )}
      </div>
    </div>
  );
};

export default LabelDisplay;
