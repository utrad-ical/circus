import Icon from '#components/Icon.tsx';
import Select from '#components/Select.tsx';
import useShowMessage from '#utils/useShowMessage.ts';
import FileUpload from '#components/FileUpload.tsx';
import Alert from '#components/Alert.tsx';
import table from '#components/table.module.css';
import classnames from 'classnames';
import React, { useState, type FC } from 'react';
import useLocalPreference from '#utils/useLocalPreference.ts';
import useLoginUser from '#utils/useLoginUser.ts';
import styles from './ImportSeries.module.css';

interface ImportSummary {
  imported: number;
  skipped: { file: string; reason: string }[];
  errors: { file: string; reason: string }[];
}

const maxRows = 100;

const ImportResult: FC<{ summary: ImportSummary }> = props => {
  const { summary } = props;
  const { imported, skipped, errors } = summary;
  const rows = [
    ...errors.map(e => ({ ...e, error: true })),
    ...skipped.map(s => ({ ...s, error: false }))
  ];
  return (
    <div>
      <Alert
        variant={
          errors.length || !imported
            ? 'danger'
            : skipped.length
              ? 'warning'
              : 'success'
        }
      >
        Imported {imported} file(s).
        {skipped.length > 0 && <> Skipped {skipped.length} file(s).</>}
        {errors.length > 0 && <> Failed to import {errors.length} file(s).</>}
        {!imported && !errors.length && <> No DICOM file was found.</>}
      </Alert>
      {rows.length > 0 && (
        <table
          className={classnames(table.table, table.condensed, styles.result)}
        >
          <thead>
            <tr>
              <th>File</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, maxRows).map((row, i) => (
              <tr key={i} className={row.error ? styles.error : undefined}>
                <td>{row.file}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
            {rows.length > maxRows && (
              <tr>
                <td colSpan={2}>
                  <i>
                    And <b>{rows.length - maxRows}</b> more file(s)
                  </i>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

const ImportSeries: FC<{}> = props => {
  const loginUser = useLoginUser()!;
  const showMessage = useShowMessage();
  const domains = loginUser.domains || [];
  const [summary, setSummary] = useState<ImportSummary>();

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
      <Alert variant="warning">
        You do not have any accessible domain. Uploading is not allowed.
      </Alert>
    );
  }

  const handleUploaded = (res: any) => {
    if (typeof res?.imported === 'number') {
      setSummary(res);
    } else {
      setSummary(undefined);
      showMessage(res?.error ?? 'Upload failed.', 'danger');
    }
  };

  return (
    <div>
      <h1>
        <Icon icon="circus-series-import" /> Series Import
      </h1>
      <p>
        Choose DICOM files or folders to upload. Zip and tar.gz archives of
        DICOM files are also supported.
      </p>
      <FileUpload
        multiple={true}
        allowFolders={true}
        withProgress={true}
        url={`series/domain/${encodeURIComponent(uploadDomain || '')}`}
        onUploaded={handleUploaded}
      >
        <div>
          Upload Domain:&ensp;
          <Select
            options={loginUser.domains}
            value={uploadDomain!}
            onChange={setUploadDomain}
          />
        </div>
        <hr />
      </FileUpload>
      {summary && <ImportResult summary={summary} />}
    </div>
  );
};

export default ImportSeries;
