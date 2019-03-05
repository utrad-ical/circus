import React from 'react';
import FileUpload from 'components/FileUpload';
import Icon from 'components/Icon';

const ImportCase = props => {
  return (
    <div>
      <h1>
        <Icon icon="open" /> Case Import
      </h1>
      <FileUpload multiple={false}>
        <p>Upload a case archive file.</p>
      </FileUpload>
    </div>
  );
};

export default ImportCase;
