import React from 'react';
import {
  Button,
  ButtonToolbar,
  Glyphicon,
  ProgressBar
} from './react-bootstrap';
import { FileDroppable } from './FileDroppable';
import { showMessage } from 'actions';
import * as modal from 'rb/modal';
import styled from 'styled-components';
import { api } from 'utils/api';

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
export class FileUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = { filesSelected: [], uploading: false, progress: 0 };
  }

  handleDropFile = files => {
    this.setState({ filesSelected: files });
  };

  handleFileSelect = () => {
    this.setState({ filesSelected: this.fileInput.files });
  };

  handleUploadProgress = event => {
    const bytesSent = event.loaded;
    const bytesTotal = event.total;
    this.setState({ progress: Math.floor(bytesSent * 100 / bytesTotal) });
  };

  handleUploadClick = async () => {
    const { url, onBeforeUpload, onUploaded } = this.props;

    const files = this.state.filesSelected;
    const num = files.length;
    if (typeof num !== 'number' || num <= 0) return;

    const fd = new FormData();
    let totalBytes = 0;

    for (let i = 0; i < num; i++) {
      fd.append('files', files[i]);
      totalBytes += files[i].size;
    }

    const fileDescription = num >= 2 ? `these ${num} files?` : 'this file?';
    const uploadFileMax = this.props.uploadFileMax;
    if (num > uploadFileMax) {
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
      `Do you want to upload ${fileDescription} (${totalBytes} bytes)`
    );
    if (!confirmed) return;

    // Allow the component user to access the FormData and modify it
    typeof onBeforeUpload === 'function' && onBeforeUpload(fd);

    try {
      this.setState({ uploading: true });
      const res = await api(url, {
        method: 'post',
        data: fd,
        progress: this.handleUploadProgress
      });
      this.setState({ filesSelected: [], uploading: false });
      typeof onUploaded === 'function' && onUploaded(res);
    } catch (err) {
      this.setState({ uploading: false });
      showMessage(`Upload failed (Error ${err.status})`, 'danger');
      throw err;
    }
  };

  render() {
    return (
      <FileDroppable onDropFile={this.handleDropFile}>
        <StyledDiv className="well">
          {this.props.children}
          <div>
            <input
              ref={r => (this.fileInput = r)}
              type="file"
              multiple={!!this.props.multiple}
              onChange={this.handleFileSelect}
            />
            {this.state.filesSelected.length == 0 ? (
              <Button bsStyle="default" onClick={() => this.fileInput.click()}>
                <Glyphicon glyph="plus" />&ensp;Select File
              </Button>
            ) : (
              <ButtonToolbar>
                <Button
                  bsStyle="primary"
                  disabled={this.state.filesSelected.length < 1}
                  onClick={this.handleUploadClick}
                >
                  <Glyphicon glyph="upload" />&ensp;Upload
                </Button>
                <Button
                  bsStyle="link"
                  onClick={() => this.setState({ filesSelected: [] })}
                >
                  Reset
                </Button>
              </ButtonToolbar>
            )}
          </div>
          {this.state.uploading && (
            <div className="progress-container">
              <div className="text-primary">Uploading:</div>
              <ProgressBar
                now={this.state.progress}
                label={this.state.progress + '%'}
                striped
                active
              />
            </div>
          )}
          <SummaryTable files={this.state.filesSelected} />
          <p>You can drag and drop files to this box.</p>
        </StyledDiv>
      </FileDroppable>
    );
  }
}

const SummaryTable = props => {
  const files = props.files;
  const show = 10;
  let totalSize = 0;
  if (files.length < 1) return null;
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
          if (i >= show) return null;
          return (
            <tr key={i}>
              <td>{f.name}</td>
              <td className="text-right">{f.size}</td>
            </tr>
          );
        })}
        {files.length > show && (
          <tr>
            <td>
              <i>And {files.length - show} file(s)</i>
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
