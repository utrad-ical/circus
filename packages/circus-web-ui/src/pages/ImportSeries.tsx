import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { showMessage } from 'actions';
import FileUpload from 'components/FileUpload';
import { Alert } from 'components/react-bootstrap';
import React, { useState } from 'react';
import useLocalPreference from 'utils/useLocalPreference';
import useLoginUser from 'utils/useLoginUser';

const ImportSeries: React.FC<{}> = props => {
  const loginUser = useLoginUser()!;
  const domains = loginUser.domains || [];

  const [domainPreference, setDomainPreference] = useLocalPreference<
    string | null
  >('domain', null);

  const [uploadDomain, setUploadDomain] = useState(
    () =>
      domainPreference ??
      loginUser.defaultDomain ??
      (domains.length ? domains[0] : null)
  );

  if (!Array.isArray(domains) || domains.length === 0) {
    return (
      <Alert bsStyle="warning">
        You do not have any accessible domain. Uploading is not allowed.
      </Alert>
    );
  }

  const handleUploaded = async (res: any) => {
    setDomainPreference(uploadDomain);
    const count = res.uploaded;
    showMessage(`Successfully uploaded ${count} DICOM instances!`, 'success', {
      short: true
    });
  };

  return (
    <div>
      <h1>
        <span className="circus-icon-series-import" /> Series Import
      </h1>
      <p>
        Choose DICOM files to upload. (Maximum size:{' '}
        {loginUser.uploadFileSizeMax}, up to {loginUser.uploadFileMax} files).
      </p>
      <p>Zipped DICOM files are also supported.</p>
      <FileUpload
        multiple={true}
        targetResource="import-series"
        uploadFileMax={loginUser.uploadFileMax}
        uploadFileSizeMax={loginUser.uploadFileSizeMax}
        url={`series/domain/${encodeURIComponent(uploadDomain || '')}`}
        onUploaded={handleUploaded}
      >
        <div>
          Upload Domain:&ensp;
          <ShrinkSelect
            options={loginUser.domains}
            value={uploadDomain}
            onChange={setUploadDomain}
          />
        </div>
        <hr />
      </FileUpload>
    </div>
  );
};

export default ImportSeries;
