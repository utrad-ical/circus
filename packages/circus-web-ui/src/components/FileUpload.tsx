import React, { useState, useRef } from 'react';
import {
  Button,
  ButtonToolbar,
  Glyphicon,
  ProgressBar
} from './react-bootstrap';
import { FileDroppable } from './FileDroppable';
import useShowMessage from 'utils/useShowMessage';
import * as modal from '@smikitky/rb-components/lib/modal';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import { withCommas } from 'utils/util';
import IconButton from './IconButton';

const StyledDiv = styled.div`
  input[type='file'] {
    display: none;
  }

  table.table {
    margin: 1em;
    font-size: 80%;
  }

  .progress-container {
    margin: 10px 0;
  }
`;

const dedupeFiles = (files: File[]) => {
  const map = new Map<string, File>();
  files.forEach(f => !map.has(f.name) && map.set(f.name, f));
  return Array.from(map.values());
};

/**
 * Renderes a div with which a user can upload one ore more files.
 * Upload progress is displayed using a progress bar,
 * and the response can be accessed via a Promise.
 */
const FileUpload: React.FC<{
  url: string;
  onBeforeUpload?: (fd: FormData) => void;
  onUploaded?: (res: any) => void;
  multiple?: boolean;
  uploadFileMax?: number;
  uploadFileSizeMaxBytes?: number;
}> = props => {
  const {
    url,
    onBeforeUpload,
    onUploaded,
    children,
    multiple,
    uploadFileMax,
    uploadFileSizeMaxBytes
  } = props;

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ value: 0, label: '' });
  const fileInput = useRef<HTMLInputElement>(null);
  const api = useApi();
  const showMessage = useShowMessage();

  const handleDropFile = (newFiles: FileList) => {
    setFiles(dedupeFiles([...files, ...Array.from(newFiles)]));
  };

  const handleFileSelect = () => {
    setFiles(dedupeFiles([...files, ...Array.from(fileInput.current!.files!)]));
  };

  const handleUploadProgress = (event: ProgressEvent) => {
    const bytesSent = event.loaded;
    const bytesTotal = event.total;
    const percent = Math.floor((bytesSent * 100) / bytesTotal);
    setProgress({
      value: percent,
      label:
        bytesSent === bytesTotal
          ? 'Upload done. Waiting for import...'
          : `${percent}% Uploaded.`
    });
  };

  const totalBytes = files.reduce((sum, f) => (sum += f.size), 0);

  const canUpload =
    !uploading &&
    files.length > 0 &&
    !(files.length > (uploadFileMax ?? Infinity)) &&
    !(totalBytes > (uploadFileSizeMaxBytes ?? Infinity));

  const handleUploadClick = async () => {
    if (!files.length) return;

    const confirmed = await modal.confirm(
      `Do you want to upload ${
        files.length >= 2 ? `these ${files.length} files` : 'this file'
      }? (${withCommas(totalBytes)} bytes)`
    );
    if (!confirmed) return;

    const fd = new FormData();
    files.forEach(f => fd.append('files', f));

    // Allow the component user to access the FormData and modify it
    typeof onBeforeUpload === 'function' && onBeforeUpload(fd);

    try {
      setUploading(true);
      const res = await api(url, {
        method: 'post',
        data: fd,
        onUploadProgress: handleUploadProgress
      });
      setFiles([]);
      setUploading(false);
      typeof onUploaded === 'function' && onUploaded(res);
    } catch (err) {
      setUploading(false);
      showMessage(`Upload failed (Error ${err.status})`, 'danger');
      throw err;
    }
  };

  return (
    <FileDroppable onDropFile={handleDropFile}>
      <StyledDiv className="well">
        {children}
        <div>
          <input
            ref={fileInput}
            type="file"
            multiple={!!multiple}
            onChange={handleFileSelect}
          />
          {files.length > 0 && (
            <>
              <ButtonToolbar>
                <Button
                  bsStyle="primary"
                  disabled={!canUpload}
                  onClick={handleUploadClick}
                >
                  <Glyphicon glyph="upload" />
                  &ensp;Upload
                </Button>
                <Button
                  bsStyle="link"
                  disabled={uploading}
                  onClick={() => setFiles([])}
                >
                  Reset
                </Button>
              </ButtonToolbar>
              {files.length > (uploadFileMax ?? Infinity) && (
                <div className="alert alert-danger">
                  You cannot upload more than {uploadFileMax} files at the same
                  time. Use a zipped file.
                </div>
              )}
              {totalBytes > (uploadFileSizeMaxBytes ?? Infinity) && (
                <div className="alert alert-danger">
                  You cannot upload more than{' '}
                  {withCommas(uploadFileSizeMaxBytes!)} bytes of data at the
                  same time.
                </div>
              )}
            </>
          )}
          <SummaryTable files={files} onChange={setFiles} />
          <Button bsStyle="default" onClick={() => fileInput.current!.click()}>
            <Glyphicon glyph="plus" />
            &ensp;{files.length > 0 ? 'Add More file' : 'Select File'}
          </Button>
        </div>
        {uploading && (
          <div className="progress-container">
            <div className="text-primary">Uploading:</div>
            <ProgressBar
              now={progress.value}
              label={progress.label}
              striped
              active
            />
          </div>
        )}
        <p>You can drag and drop files to this box.</p>
      </StyledDiv>
    </FileDroppable>
  );
};

export default FileUpload;

const SummaryTable: React.FC<{
  files: File[];
  onChange: (files: File[]) => void;
  showMax?: number;
}> = props => {
  const { files, onChange, showMax = 10 } = props;
  if (files.length < 1) return null;
  const totalBytes = files.reduce((sum, f) => (sum += f.size), 0);

  const handleDelete = (index: number) => {
    onChange(files.filter((f, i) => i !== index));
  };

  return (
    <table className="table table-condensed">
      <thead>
        <tr>
          <th style={{ width: '100%' }}>File</th>
          <th className="text-right">Size</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {files.map((f, i) => {
          if (i >= showMax) return null;
          return (
            <tr key={i}>
              <td>{f.name}</td>
              <td className="text-right">{withCommas(f.size)}</td>
              <td>
                <IconButton
                  icon="remove"
                  bsSize="xs"
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
          <tr className="info">
            <th>Total: {files.length} files</th>
            <th className="text-right">{withCommas(totalBytes)}</th>
            <th />
          </tr>
        </tfoot>
      )}
    </table>
  );
};
