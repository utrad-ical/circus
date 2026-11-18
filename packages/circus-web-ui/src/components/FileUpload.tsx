import type { ProgressCreated } from '@utrad-ical/circus-api-schema';
import Button from '#components/Button.tsx';
import React, { useEffect, useRef, useState } from 'react';
import ProgressBar from './ProgressBar.tsx';
import { FileDroppable, type FileWithPath } from './FileDroppable.tsx';
import LogPane from './LogPane.tsx';
import useShowMessage from '#utils/useShowMessage.ts';
import * as modal from '#components/dialogs.tsx';
import classnames from 'classnames';
import styles from './FileUpload.module.css';
import table from './table.module.css';
import { api } from '#utils/api.ts';
import useProgress from '#utils/useProgress.ts';
import { withCommas } from '#utils/util.ts';

const dedupeFiles = (files: FileWithPath[]) => {
  const map = new Map<string, FileWithPath>();
  files.forEach(f => !map.has(f.path) && map.set(f.path, f));
  return Array.from(map.values());
};

const fromInput = (input: HTMLInputElement): FileWithPath[] => {
  const files = Array.from(input.files ?? []).map(file => ({
    file,
    path: file.webkitRelativePath || file.name
  }));
  input.value = ''; // allows selecting the same files again
  return files;
};

/**
 * Renderes a div with which a user can upload one ore more files.
 * Upload progress is displayed using a progress bar,
 * and the response can be accessed via a Promise.
 */
const FileUpload = <Result,>(props: {
  url: string;
  onBeforeUpload?: (fd: FormData) => void;
  /**
   * Called with the response body,
   * which may be of 400 or 422 (e.g., some files failed)
   */
  onUploaded?: (res: Result) => void;
  multiple?: boolean;
  /** Allows selecting and dropping folders */
  allowFolders?: boolean;
  /** Shows the progress and the log of the server (see `/api/progress`) */
  withProgress?: boolean;
  children?: React.ReactNode;
}) => {
  const {
    url,
    onBeforeUpload,
    onUploaded,
    children,
    multiple,
    allowFolders,
    withProgress
  } = props;

  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [progressId, setProgressId] = useState<string | null>(null);
  const progress = useProgress(progressId);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const showMessage = useShowMessage();

  useEffect(() => {
    if (folderInput.current) folderInput.current.webkitdirectory = true;
  }, [allowFolders]);

  useEffect(() => {
    if (!uploading) return;
    // Leaving the page stops the upload
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploading]);

  const addFiles = (newFiles: FileWithPath[]) => {
    const dropped = multiple ? newFiles : newFiles.slice(0, 1);
    setFiles(multiple ? dedupeFiles([...files, ...dropped]) : dropped);
  };

  const handleUploadProgress = ({
    loaded,
    total
  }: {
    loaded: number;
    total?: number;
  }) => {
    if (total) setUploadPercent(Math.floor((loaded * 100) / total));
  };

  const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0);

  const handleUploadClick = async () => {
    if (!files.length) return;

    const confirmed = await modal.confirm(
      `Do you want to upload ${
        files.length >= 2 ? `these ${files.length} files` : 'this file'
      }? (${withCommas(totalBytes)} bytes)`
    );
    if (!confirmed) return;

    const fd = new FormData();
    files.forEach(f => fd.append('files', f.file, f.path));

    // Allow the component user to access the FormData and modify it
    typeof onBeforeUpload === 'function' && onBeforeUpload(fd);

    setUploading(true);
    setUploadPercent(0);
    try {
      let target = url;
      if (withProgress) {
        const { progressId } = await api<ProgressCreated>('progress', {
          method: 'post',
          data: {}
        });
        setProgressId(progressId);
        target +=
          (url.includes('?') ? '&' : '?') +
          `progressId=${encodeURIComponent(progressId)}`;
      }
      const res = await api<Result, FormData>(target, {
        method: 'post',
        data: fd,
        onUploadProgress: handleUploadProgress,
        handleErrors: [400, 422]
      });
      setFiles([]);
      typeof onUploaded === 'function' && onUploaded(res);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 422) {
        setFiles([]);
        typeof onUploaded === 'function' && onUploaded(err.response.data);
      } else {
        showMessage(`Upload failed (Error ${status ?? 'network'})`, 'danger');
      }
    } finally {
      setUploading(false);
    }
  };

  const uploadLabel =
    (uploadPercent < 100 ? `${uploadPercent}% uploaded` : 'Uploaded') +
    (progress?.message ? ` | ${progress.message}` : '');

  return (
    <FileDroppable
      onDropFiles={files =>
        addFiles(
          allowFolders ? files : files.filter(f => !f.path.includes('/'))
        )
      }
      className={styles.droppable}
    >
      <div className={styles.fileUpload}>
        {children}
        <div>
          <input
            ref={fileInput}
            type="file"
            multiple={!!multiple}
            onChange={() => addFiles(fromInput(fileInput.current!))}
          />
          {allowFolders && (
            <input
              ref={folderInput}
              type="file"
              onChange={() => addFiles(fromInput(folderInput.current!))}
            />
          )}
          {files.length > 0 && (
            <div className={styles.uploadButtons}>
              <Button
                variant="primary"
                disabled={uploading}
                onClick={handleUploadClick}
                icon="material-arrow_circle_up"
              >
                Upload
              </Button>
              <Button
                variant="link"
                disabled={uploading}
                onClick={() => setFiles([])}
              >
                Reset
              </Button>
            </div>
          )}
          <SummaryTable files={files} onChange={setFiles} />
          <div className={styles.selectButtons}>
            <Button
              disabled={uploading}
              onClick={() => fileInput.current!.click()}
              icon="material-add"
            >
              {files.length > 0 ? 'Add Files' : 'Select Files'}
            </Button>
            {allowFolders && (
              <Button
                disabled={uploading}
                onClick={() => folderInput.current!.click()}
                icon="material-folder_open"
              >
                {files.length > 0 ? 'Add Folder' : 'Select Folder'}
              </Button>
            )}
          </div>
        </div>
        {uploading && (
          <div className={styles.uploading}>
            <div>Uploading:</div>
            <ProgressBar value={uploadPercent} label={uploadLabel} />
          </div>
        )}
        {withProgress && progress && <LogPane lines={progress.logs ?? []} />}
        <p>
          You can drag and drop {allowFolders ? 'files or folders' : 'files'} to
          this box.
        </p>
      </div>
    </FileDroppable>
  );
};

export default FileUpload;

const SummaryTable: React.FC<{
  files: FileWithPath[];
  onChange: (files: FileWithPath[]) => void;
  showMax?: number;
}> = props => {
  const { files, onChange, showMax = 10 } = props;
  if (files.length < 1) return null;
  const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0);

  const handleDelete = (index: number) => {
    onChange(files.filter((f, i) => i !== index));
  };

  return (
    <table className={classnames(table.table, table.condensed, styles.files)}>
      <thead>
        <tr>
          <th style={{ width: '100%' }}>File</th>
          <th className={styles.number}>Size</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {files.map((f, i) => {
          if (i >= showMax) return null;
          return (
            <tr key={i}>
              <td>{f.path}</td>
              <td className={styles.number}>{withCommas(f.file.size)}</td>
              <td>
                <Button
                  icon="material-close"
                  size="xsmall"
                  onClick={() => handleDelete(i)}
                />
              </td>
            </tr>
          );
        })}
        {files.length > showMax && (
          <tr>
            <td>
              <i>
                And <b>{files.length - showMax}</b> more file(s)
              </i>
            </td>
            <td />
            <td />
          </tr>
        )}
      </tbody>
      {files.length > 1 && (
        <tfoot>
          <tr className={table.active}>
            <th>Total: {files.length} files</th>
            <th className={styles.number}>{withCommas(totalBytes)}</th>
            <th />
          </tr>
        </tfoot>
      )}
    </table>
  );
};
