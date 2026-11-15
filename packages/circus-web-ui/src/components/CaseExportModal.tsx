import styles from './DownloadModal.module.css';
import type { Editor } from '#components/editorTypes.tsx';
import Select from '#components/Select.tsx';
import type { ExternalLabel } from '#pages/case-detail/labelData.ts';
import type { Revision } from '#pages/case-detail/revisionData.ts';
import RevisionSelector from '#pages/case-detail/RevisionSelector.tsx';
import React, { type FC, useCallback, useMemo } from 'react';
import { api } from '#utils/api.ts';
import type { CompressionFormat, LineEnding } from './DownloadModal.tsx';
import DownloadModal, {
  compressionFormatOptions,
  lineEndingOptions
} from './DownloadModal.tsx';

type LabelPackTypeOptions = 'isolated' | 'combined';

type VolumeOptions = 'default' | 'fullOriginal';

interface CaseExportOptions {
  /** Only when exporting a case */
  revisionIndex?: number;
  volume: VolumeOptions;
  mhdLineEnding: LineEnding;
  labelPackType: LabelPackTypeOptions;
  compressionFormat: CompressionFormat;
}

const volumeOptions: { [type in VolumeOptions]: string } = {
  default: 'Default',
  fullOriginal: 'Full original volume'
};

const labelPackTypeOptions: { [type in LabelPackTypeOptions]: string } = {
  isolated: 'Isolated (one raw file per label)',
  combined: 'Combined'
};

const createCaseExportOptionsEditor: (
  revisions?: Revision<ExternalLabel>[]
) => Editor<CaseExportOptions> = revisions => props => {
  const { value, onChange } = props;

  const handleRevSelectorChange = (revisionIndex: number) => {
    onChange({ ...value, revisionIndex });
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
            value={value.revisionIndex!}
            onChange={handleRevSelectorChange}
          />
        </div>
      )}
      <div className={styles.option}>
        Volume:{' '}
        <Select
          options={volumeOptions}
          value={value.volume}
          onChange={v => onChange({ ...value, volume: v })}
        />
      </div>
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

const CaseExportModal: FC<{
  caseIds: string[];
  onClose: () => void;
  /** The revision selected first; used with `revisions` */
  revisionIndex?: number;
  revisions?: Revision<ExternalLabel>[];
}> = props => {
  const { onClose, caseIds, revisionIndex, revisions } = props;
  const caption = `Export ${caseIds.length} case${
    caseIds.length !== 1 ? 's' : ''
  }`;

  const onStart = useCallback(
    async (options: CaseExportOptions) => {
      const { revisionIndex, volume, ...rest } = options;
      const params = new URLSearchParams({
        caseIds: caseIds.join(','),
        ...rest
      });
      if (revisionIndex !== undefined)
        params.set('revisionIndex', String(revisionIndex));
      if (volume === 'fullOriginal') params.set('fullOriginalVolume', '1');
      return { url: api.getBaseUrl() + 'cases/export-mhd?' + params };
    },
    [caseIds]
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
        revisionIndex: revisions ? revisionIndex : undefined,
        volume: 'default',
        mhdLineEnding: 'lf',
        labelPackType: 'isolated',
        compressionFormat: 'tgz'
      }}
      optionsEditor={OptionsEditor}
    />
  );
};

export default CaseExportModal;
