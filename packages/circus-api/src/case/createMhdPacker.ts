import zeroPad from '../utils/zeroPad';
import RawData from '@utrad-ical/circus-rs/src/common/RawData';
import { Vector3D } from '@utrad-ical/circus-rs/src/common/geometry';
import { TaskEventEmitter } from '../createTaskManager';
import { Writable } from 'stream';
import {
  FunctionService,
  Logger,
  generateMhdHeader
} from '@utrad-ical/circus-lib';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import { Models } from '../interface';
import Storage from '../storage/Storage';
import path from 'path';
import Archiver from 'archiver';

export type CaseExportTarget =
  | string
  | { caseId: string; revisionIndex?: number };

export interface MhdPacker {
  packAsMhd: (
    taskEmitter: TaskEventEmitter,
    downloadFileStream: Writable,
    caseIds: CaseExportTarget[],
    options?: PackOptions
  ) => void;
}

export type LabelPackType = 'isolated' | 'combined';
export type LineEndingType = 'lf' | 'crlf';
export type CompressionFormat = 'zip' | 'tgz';

export interface PackOptions {
  labelPackType: LabelPackType;
  mhdLineEnding: LineEndingType;
  compressionFormat: CompressionFormat;
}

const defaultLabelPackOptions: PackOptions = {
  labelPackType: 'isolated',
  mhdLineEnding: 'lf',
  compressionFormat: 'tgz'
};

const createMhdPacker: FunctionService<
  MhdPacker,
  {
    models: Models;
    volumeProvider: VolumeProvider;
    blobStorage: Storage;
    apiLogger: Logger;
  }
> = async (opts, deps) => {
  const { models, volumeProvider, blobStorage, apiLogger } = deps;

  const putLabelData = async ({
    labelFileBaseName,
    series,
    dimension,
    elementSpacing,
    archiver,
    options
  }: {
    labelFileBaseName: string;
    series: any;
    dimension: Vector3D;
    elementSpacing: Vector3D;
    archiver: Archiver.Archiver;
    options: PackOptions;
  }) => {
    let combinedVolume: RawData | undefined;
    if (
      options.labelPackType === 'combined' &&
      series.labels.some((l: any) => l.type === 'voxel')
    ) {
      combinedVolume = new RawData(dimension, 'uint8');
    }
    for (let labelId = 0; labelId < series.labels.length; labelId++) {
      const label = series.labels[labelId];
      if (label.type !== 'voxel') continue;
      const labelName = labelFileBaseName + `${pad(labelId)}`;
      const hash = label.data.voxels;
      if (!hash) continue; // empty voxels
      const labelBuffer = await blobStorage.read(hash);
      const labelVol = new RawData(label.data.size, 'binary');
      labelVol.assign(labelBuffer.buffer);
      if (options.labelPackType === 'combined') {
        combinedVolume!.copy(
          labelVol,
          undefined,
          label.data.origin,
          (srcValue, destValue) => (srcValue > 0 ? labelId + 1 : destValue)
        );
      } else {
        const vol = new RawData(dimension, 'uint8');
        vol.copy(labelVol, undefined, label.data.origin);
        archiver.append(Buffer.from(vol.data), { name: labelName + '.raw' });
        archiver.append(
          generateMhdHeader(
            'uint8',
            dimension,
            elementSpacing,
            path.basename(labelName + '.raw'),
            options.mhdLineEnding
          ),
          { name: labelName + '.mhd' }
        );
      }
    }
    if (options.labelPackType === 'combined' && combinedVolume) {
      archiver.append(Buffer.from(combinedVolume!.data), {
        name: labelFileBaseName + '.raw'
      });
      archiver.append(
        generateMhdHeader(
          'uint8',
          dimension,
          elementSpacing,
          path.basename(labelFileBaseName + '.raw'),
          options.mhdLineEnding
        ),
        { name: labelFileBaseName + '.mhd' }
      );
    }
  };

  /**
   * Inserts a single case data into a root zip foler or a subdirectory.
   */
  const putCaseData = async (
    caseId: string,
    revisionIndex: number | undefined,
    archiver: Archiver.Archiver,
    options: PackOptions
  ) => {
    const caseData = await models.clinicalCase.findByIdOrFail(caseId);
    if ((revisionIndex ?? -1) < -caseData.revisions.length)
      throw new Error('Invalid revision index: ' + `${revisionIndex}`);
    const rev = caseData.revisions.slice(revisionIndex ?? -1)[0];
    if (!rev) throw new Error('Invalid revision index');
    archiver.append(
      JSON.stringify(prepareExportObject(caseData, rev), null, '  '),
      { name: `${caseId}/data.json` }
    );
    for (let volId = 0; volId < rev.series.length; volId++) {
      const series = rev.series[volId];
      const volumeAccessor = await volumeProvider(series.seriesUid);
      await volumeAccessor.load(volumeAccessor.images);
      const volume = volumeAccessor.volume;
      const primaryImageNo = volumeAccessor.images.min();
      const primaryMetadata = volumeAccessor.imageMetadata.get(
        primaryImageNo!
      )!;
      const pitch = await volumeAccessor.determinePitch();
      const elementSpacing = [
        primaryMetadata.pixelSpacing[0],
        primaryMetadata.pixelSpacing[1],
        pitch
      ] as Vector3D;

      const rawFileBaseName = `${caseId}/vol${pad(volId)}`;
      archiver.append(Buffer.from(volume.data), {
        name: rawFileBaseName + '.raw'
      });
      const dimension = volume.getDimension();
      archiver.append(
        generateMhdHeader(
          volume.getPixelFormat(),
          dimension,
          elementSpacing,
          path.basename(rawFileBaseName + '.raw'),
          options.mhdLineEnding
        ),
        { name: rawFileBaseName + '.mhd' }
      );
      const labelFileBaseName = `${caseId}/vol${pad(volId)}-label`;
      await putLabelData({
        labelFileBaseName,
        series,
        dimension,
        elementSpacing,
        archiver,
        options
      });
    }
  };

  const packAsMhd = async (
    taskEmitter: TaskEventEmitter,
    downloadFileStream: Writable,
    caseIds: CaseExportTarget[],
    packOptions: PackOptions = defaultLabelPackOptions
  ) => {
    const archiver =
      packOptions.compressionFormat === 'zip'
        ? Archiver('zip')
        : Archiver('tar', { gzip: true });

    try {
      for (let i = 0; i < caseIds.length; i++) {
        const t = caseIds[i];
        const { caseId, revisionIndex } =
          typeof t === 'string' ? { caseId: t, revisionIndex: -1 } : t;
        taskEmitter.emit(
          'progress',
          `Packing data for ${caseId}`,
          i,
          caseIds.length
        );
        await putCaseData(caseId, revisionIndex, archiver, packOptions);
      }
      archiver.pipe(downloadFileStream);
      taskEmitter.emit(
        'progress',
        'Performing compression...',
        undefined,
        undefined
      );
      downloadFileStream.on('close', () => {
        taskEmitter.emit('finish', `Exported ${caseIds.length} case(s).`);
      });
      archiver.finalize();
    } catch (err) {
      apiLogger.error('Case export error');
      apiLogger.error(err.message);
      taskEmitter.emit(
        'error',
        'An internal error occurred while processing the case data.'
      );
    }
  };

  return { packAsMhd };
};

createMhdPacker.dependencies = [
  'models',
  'volumeProvider',
  'blobStorage',
  'apiLogger'
];

export default createMhdPacker;

/**
 * Turns `3` to `'003'`, etc.
 * @param num A nonnegative integer
 */
const pad = (num: number) => zeroPad(3, num);

const prepareExportObject = (caseData: any, revision: any) => {
  return {
    caseId: caseData.caseId,
    createdAt: caseData.createdAt.toISOString(),
    updatedAt: caseData.updatedAt.toISOString(),
    projectId: caseData.projectId,
    revision
  };
};
