import { Editor } from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import React, { useCallback } from 'react';
import { useApi } from 'utils/api';
import DownloadModal from './DownloadModal';

type LabelPackTypeOptions = 'isolated' | 'combined';
type LineEnding = 'lf' | 'crlf';
type CompressionFormat = 'tgz' | 'zip';

interface CaseExportOptions {
  caseIds: string[];
  mhdLineEnding: LineEnding;
  labelPackType: LabelPackTypeOptions;
  compressionFormat: CompressionFormat;
}

const labelPackTypeOptions: { [type in LabelPackTypeOptions]: string } = {
  isolated: 'Isolated (one raw file per label)',
  combined: 'Combined'
};

const mhdLineEndingOptions: { [type in LineEnding]: string } = {
  lf: 'LF',
  crlf: 'CR + LF (Windows)'
};

const compressionFormatOptions: { [type in CompressionFormat]: string } = {
  tgz: 'tar.gz',
  zip: 'zip'
};

const CaseExportOptionsEditor: Editor<CaseExportOptions> = props => {
  const { value, onChange } = props;
  return (
    <div>
      <div className="row">
        Voxel labels:{' '}
        <ShrinkSelect
          options={labelPackTypeOptions}
          value={value.labelPackType}
          onChange={v => onChange({ ...value, labelPackType: v })}
        />
      </div>
      <div className="row">
        MHD file line endings:{' '}
        <ShrinkSelect
          options={mhdLineEndingOptions}
          value={value.mhdLineEnding}
          onChange={v => onChange({ ...value, mhdLineEnding: v })}
        />
      </div>
      <div className="row">
        Compression format:{' '}
        <ShrinkSelect
          options={compressionFormatOptions}
          value={value.compressionFormat}
          onChange={v => onChange({ ...value, compressionFormat: v })}
        />
      </div>
    </div>
  );
};

const CaseExportModal: React.FC<{
  caseIds: string[];
  onClose: () => void;
}> = props => {
  const { onClose, caseIds } = props;
  const caption = `Export ${caseIds.length} case${
    caseIds.length !== 1 ? 's' : ''
  }`;
  const api = useApi();

  const onStart = useCallback(
    async (options: CaseExportOptions) => {
      const res = await api(`/cases/export-mhd`, {
        method: 'post',
        data: options
      });
      return res.taskId;
    },
    [api]
  );

  return (
    <DownloadModal
      onClose={onClose}
      caption={caption}
      onStart={onStart}
      initialOptions={{
        caseIds,
        mhdLineEnding: 'lf',
        labelPackType: 'isolated',
        compressionFormat: 'tgz'
      }}
      optionsEditor={CaseExportOptionsEditor}
    />
  );
};

export default CaseExportModal;
