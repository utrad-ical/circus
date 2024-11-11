import { Editor } from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { produce } from 'immer';
import { ExternalLabel } from 'pages/case-detail/labelData';
import { Revision } from 'pages/case-detail/revisionData';
import RevisionSelector from 'pages/case-detail/RevisionSelector';
import React, { useCallback, useMemo } from 'react';
import { useApi } from 'utils/api';
import DownloadModal, {
  CompressionFormat,
  compressionFormatOptions,
  LineEnding,
  lineEndingOptions
} from './DownloadModal';

type LabelPackTypeOptions = 'isolated' | 'combined';

type ExportTarget = string | { caseId: string; revisionIndex: number };

interface CaseExportOptions {
  caseIds: ExportTarget[];
  mhdLineEnding: LineEnding;
  labelPackType: LabelPackTypeOptions;
  compressionFormat: CompressionFormat;
}

const labelPackTypeOptions: { [type in LabelPackTypeOptions]: string } = {
  isolated: 'Isolated (one raw file per label)',
  combined: 'Combined'
};

const createCaseExportOptionsEditor: (
  revisions?: Revision<ExternalLabel>[]
) => Editor<CaseExportOptions> = revisions => props => {
  const { value, onChange } = props;

  const handleRevSelectorChange = (revisionIndex: number) => {
    onChange(
      produce(value, draft => {
        const caseId =
          typeof draft.caseIds[0] === 'string'
            ? draft.caseIds[0]
            : draft.caseIds[0].caseId;
        draft.caseIds[0] = { caseId, revisionIndex };
      })
    );
  };

  const RevSelector = useMemo<Editor<number>>(
    () =>
      ({ value, onChange }) => {
        if (!revisions) return null;
        return (
          <RevisionSelector
            selected={value}
            onSelect={onChange}
            revisions={revisions}
          />
        );
      },
    []
  );

  return (
    <div>
      {revisions && (
        <div className="row">
          Target revision:{' '}
          <RevSelector
            value={(value.caseIds[0] as any).revisionIndex}
            onChange={handleRevSelectorChange}
          />
        </div>
      )}
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
          options={lineEndingOptions}
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
  caseIds: ExportTarget[];
  onClose: () => void;
  revisions?: Revision<ExternalLabel>[];
}> = props => {
  const { onClose, caseIds, revisions } = props;
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

  const OptionsEditor = useMemo(
    () => createCaseExportOptionsEditor(revisions),
    [revisions]
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
      optionsEditor={OptionsEditor}
    />
  );
};

export default CaseExportModal;
