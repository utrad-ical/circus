import React from 'react';
import FileUpload from 'components/FileUpload';
import Icon from 'components/Icon';
import { Alert } from 'components/react-bootstrap';

const ImportCase: React.FC<{}> = props => {
  return (
    <div>
      <h1>
        <Icon icon="open" /> Case Import
      </h1>
      <Alert bsStyle="danger">This function is not implemented.</Alert>
      <FileUpload multiple={false}>
        <p>Upload a case archive file.</p>
      </FileUpload>
    </div>
  );
};

export default ImportCase;
