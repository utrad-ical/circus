import styles from './DownloadModal.module.css';
import type { Editor } from '#components/editorTypes.tsx';
import Select from '#components/Select.tsx';
import { produce } from 'immer';
import type { ExternalLabel } from '#pages/case-detail/labelData.ts';
import type { Revision } from '#pages/case-detail/revisionData.ts';
import RevisionSelector from '#pages/case-detail/RevisionSelector.tsx';
import React, { useCallback, useMemo } from 'react';
import { api } from '#utils/api.ts';
import type { CompressionFormat, LineEnding } from './DownloadModal.tsx';
import DownloadModal, {
  compressionFormatOptions,
  lineEndingOptions
} from './DownloadModal.tsx';

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
        <div className={styles.option}>
          Target revision:{' '}
          <RevSelector
            value={(value.caseIds[0] as any).revisionIndex}
            onChange={handleRevSelectorChange}
          />
        </div>
      )}
      <div className={styles.option}>
        Voxel labels:{' '}
        <Select
          options={labelPackTypeOptions}
          value={value.labelPackType}
          onChange={v => onChange({ ...value, labelPackType: v })}
        />
      </div>
      <div className={styles.option}>
        MHD file line endings:{' '}
        <Select
          options={lineEndingOptions}
          value={value.mhdLineEnding}
          onChange={v => onChange({ ...value, mhdLineEnding: v })}
        />
      </div>
      <div className={styles.option}>
        Compression format:{' '}
        <Select
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

  const onStart = useCallback(async (options: CaseExportOptions) => {
    const res = await api(`/cases/export-mhd`, {
      method: 'post',
      data: options
    });
    return res.taskId;
  }, []);

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
