import React, { useState } from 'react';
import classnames from 'classnames';
import styles from './FileDroppable.module.css';

/** A file with its path relative to the dropped/selected folder */
export interface FileWithPath {
  file: File;
  path: string;
}

const readEntries = (reader: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>((resolve, reject) =>
    reader.readEntries(resolve, reject)
  );

const collectFiles = async (
  entry: FileSystemEntry,
  result: FileWithPath[]
): Promise<void> => {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject)
    );
    result.push({ file, path: entry.fullPath.replace(/^\//, '') });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // Returns entries in chunks until it returns an empty array
    while (true) {
      const entries = await readEntries(reader);
      if (!entries.length) break;
      for (const child of entries) await collectFiles(child, result);
    }
  }
};

/**
 * Simple div which accepts dropped files and folders.
 */
export const FileDroppable: React.FC<{
  onDropFiles: (files: FileWithPath[]) => void;
  className?: string;
  children?: React.ReactNode;
}> = props => {
  const { onDropFiles, className, children } = props;
  const [active, setActive] = useState(false);

  const dragEnter = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const dragOver = (event: React.DragEvent) => {
    event.preventDefault(); // accepts file drop
    setActive(true);
  };

  const drop = async (event: React.DragEvent) => {
    setActive(false);
    event.preventDefault();
    // Entries must be taken synchronously, before the first await
    const entries = Array.from(event.dataTransfer.items)
      .map(item => item.webkitGetAsEntry())
      .filter((entry): entry is FileSystemEntry => !!entry);
    const files: FileWithPath[] = [];
    for (const entry of entries) await collectFiles(entry, files);
    onDropFiles(files);
  };

  const dragLeaveEnd = () => {
    setActive(false);
  };

  return (
    <div
      className={classnames(
        styles.fileDroppable,
        active && styles.active,
        className
      )}
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
