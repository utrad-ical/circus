import React, { useState } from 'react';
import classnames from 'classnames';
import styles from './FileDroppable.module.css';

/**
 * Simple div which accepts file drop.
 */
export const FileDroppable: React.FC<{
  onDropFile: (files: FileList) => void;
}> = props => {
  const { onDropFile, children } = props;
  const [active, setActive] = useState(false);

  const dragEnter = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const dragOver = (event: React.DragEvent) => {
    event.preventDefault(); // accepts file drop
    setActive(true);
  };

  const drop = (event: React.DragEvent) => {
    setActive(false);
    event.preventDefault();
    const files = event.dataTransfer.files;
    onDropFile(files);
  };

  const dragLeaveEnd = () => {
    setActive(false);
  };

  return (
    <div
      className={classnames(styles.fileDroppable, active && styles.active)}
      onDragEnter={dragEnter}
      onDragOver={dragOver}
      onDrop={drop}
      onDragLeave={dragLeaveEnd}
      onDragEnd={dragLeaveEnd}
    >
      {children}
    </div>
  );
};
