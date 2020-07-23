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
}> = props => {
  const {
    url,
    onBeforeUpload,
    onUploaded,
    children,
    multiple,
    uploadFileMax
  } = props;

  const [filesSelected, setFilesSelected] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ value: 0, label: '' });
  const fileInput = useRef<HTMLInputElement>(null);
  const api = useApi();
  const showMessage = useShowMessage();

  const handleDropFile = (files: FileList) => {
    setFilesSelected(files);
  };

  const handleFileSelect = () => {
    setFilesSelected(fileInput.current!.files);
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

  const handleUploadClick = async () => {
    if (!filesSelected) return;
    const num = filesSelected.length;
    if (typeof num !== 'number' || num <= 0) return;

    const fd = new FormData();
    let totalBytes = 0;

    for (let i = 0; i < num; i++) {
      fd.append('files', filesSelected[i]);
      totalBytes += filesSelected[i].size;
    }

    const fileDescription = num >= 2 ? `these ${num} files` : 'this file';
    if (typeof uploadFileMax === 'number' && num > uploadFileMax) {
      modal.alert(
        'Sorry, you can not upload more than ' +
          uploadFileMax +
          ' files at the same time.\n' +
          'Use a zipped file, or consult the server administrator ' +
          'if they can modify the current limitation.'
      );
      return;
    }
    const confirmed = await modal.confirm(
      `Do you want to upload ${fileDescription}? (${totalBytes} bytes)`
    );
    if (!confirmed) return;

    // Allow the component user to access the FormData and modify it
    typeof onBeforeUpload === 'function' && onBeforeUpload(fd);

    try {
      setUploading(true);
      const res = await api(url, {
        method: 'post',
        data: fd,
        onUploadProgress: handleUploadProgress
      });
      setFilesSelected(null);
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
          {!filesSelected || filesSelected.length == 0 ? (
            <Button
              bsStyle="default"
              onClick={() => fileInput.current!.click()}
            >
              <Glyphicon glyph="plus" />
              &ensp;Select File
            </Button>
          ) : (
            <ButtonToolbar>
              <Button
                bsStyle="primary"
                disabled={(filesSelected || []).length < 1 || uploading}
                onClick={handleUploadClick}
              >
                <Glyphicon glyph="upload" />
                &ensp;Upload
              </Button>
              <Button
                bsStyle="link"
                disabled={uploading}
                onClick={() => setFilesSelected(null)}
              >
                Reset
              </Button>
            </ButtonToolbar>
          )}
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
        <SummaryTable files={filesSelected} />
        <p>You can drag and drop files to this box.</p>
      </StyledDiv>
    </FileDroppable>
  );
};

export default FileUpload;

const SummaryTable: React.FC<{
  files: FileList | null;
  showMax?: number;
}> = props => {
  const { files, showMax = 10 } = props;
  let totalSize = 0;
  if (!files || files.length < 1) return null;
  return (
    <table className="table table-condensed">
      <thead>
        <tr>
          <th>File</th>
          <th className="text-right">Size</th>
        </tr>
      </thead>
      <tbody>
        {Array.prototype.slice.call(files).map((f, i) => {
          totalSize += f.size;
          if (i >= showMax) return null;
          return (
            <tr key={i}>
              <td>{f.name}</td>
              <td className="text-right">{f.size}</td>
            </tr>
          );
        })}
        {files.length > showMax && (
          <tr>
            <td>
              <i>And {files.length - showMax} file(s)</i>
            </td>
            <td />
          </tr>
        )}
      </tbody>
      {files.length > 1 && (
        <tfoot>
          <tr className="info">
            <th>Total: {files.length} files</th>
            <th className="text-right">{totalSize}</th>
          </tr>
        </tfoot>
      )}
    </table>
  );
};
