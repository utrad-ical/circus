import JSZip from 'jszip';
import zeroPad from '../utils/zeroPad';
import { PixelFormat } from '@utrad-ical/circus-lib/src/PixelFormat';
import RawData from '@utrad-ical/circus-rs/src/common/RawData';
import { Vector3D } from '@utrad-ical/circus-rs/src/common/geometry';
import { TaskEventEmitter } from '../createTaskManager';
import { Writable } from 'stream';
import { FunctionService, Logger } from '@utrad-ical/circus-lib';
import { VolumeProvider } from 'circus-rs/src/server/helper/createVolumeProvider';
import { Models } from '../interface';
import Storage from '../storage/Storage';

export interface MhdPacker {
  packAsMhd: (
    taskEmitter: TaskEventEmitter,
    downloadFileStream: Writable,
    caseIds: string[],
    options?: PackOptions
  ) => void;
}

export type LabelPackType = 'isolated' | 'combined';

export interface PackOptions {
  labelPackType: LabelPackType;
}

const defaultLabelPackOptions: PackOptions = { labelPackType: 'isolated' };

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
    zip,
    options
  }: {
    labelFileBaseName: string;
    series: any;
    dimension: Vector3D;
    elementSpacing: Vector3D;
    zip: JSZip;
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
        zip.file(labelName + '.raw', vol.data);
        zip.file(
          labelName + '.mhd',
          prepareMhdHeaderAsString(
            'uint8',
            dimension,
            elementSpacing,
            labelName + '.raw'
          )
        );
      }
    }
    if (options.labelPackType === 'combined' && combinedVolume) {
      zip.file(labelFileBaseName + '.raw', combinedVolume!.data);
      zip.file(
        labelFileBaseName + '.mhd',
        prepareMhdHeaderAsString(
          'uint8',
          dimension,
          elementSpacing,
          labelFileBaseName + '.raw'
        )
      );
    }
  };

  /**
   * Inserts a single case data into a root zip foler or a subdirectory.
   */
  const putCaseData = async (
    caseId: string,
    zip: JSZip,
    options: PackOptions
  ) => {
    const caseData = await models.clinicalCase.findByIdOrFail(caseId);
    const rev = caseData.latestRevision;
    zip.file(
      `${caseId}/data.json`,
      JSON.stringify(prepareExportObject(caseData), null, '  ')
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
      zip.file(rawFileBaseName + '.raw', volume.data);
      const dimension = volume.getDimension();
      zip.file(
        rawFileBaseName + '.mhd',
        prepareMhdHeaderAsString(
          volume.getPixelFormat(),
          dimension,
          elementSpacing,
          rawFileBaseName + '.raw'
        )
      );
      const labelFileBaseName = `${caseId}/vol${pad(volId)}-label`;
      await putLabelData({
        labelFileBaseName,
        series,
        dimension,
        elementSpacing,
        zip,
        options
      });
    }
  };

  const packAsMhd = async (
    taskEmitter: TaskEventEmitter,
    downloadFileStream: Writable,
    caseIds: string[],
    packOptions: PackOptions = defaultLabelPackOptions
  ) => {
    const zip = new JSZip();
    try {
      for (let i = 0; i < caseIds.length; i++) {
        const caseId = caseIds[i];
        taskEmitter.emit(
          'progress',
          `Packing data for ${caseId}`,
          i,
          caseIds.length
        );
        await putCaseData(caseId, zip, packOptions);
      }
      zip.generateNodeStream().pipe(downloadFileStream);
      taskEmitter.emit(
        'progress',
        'Performing ZIP compression...',
        undefined,
        undefined
      );
      downloadFileStream.on('close', () => {
        taskEmitter.emit('finish', `Exported ${caseIds.length} case(s).`);
      });
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

const pixelFormatMap: { [format: string]: string } = {
  uint8: 'MET_UCHAR',
  int8: 'MET_CHAR',
  uint16: 'MET_USHORT',
  int16: 'MET_SHORT'
};

const prepareMhdHeaderAsString = (
  pixelFormat: PixelFormat,
  dimSize: Vector3D,
  elementSpacing: Vector3D,
  elementDataFile: string
) => {
  const stringifyObjet = (obj: { [key: string]: string | number }) => {
    return (
      Object.keys(obj)
        .map(k => `${k} = ${obj[k]}`)
        .join('\n') + '\n'
    );
  };
  const obj = {
    ObjectType: 'Image',
    NDims: 3,
    DimSize: dimSize.join(' '),
    ElementType: pixelFormatMap[pixelFormat],
    ElementSpacing: elementSpacing.join(' '),
    ElementByteOrderMSB: 'False',
    ElementDataFile: elementDataFile
  } as { [key: string]: string | number };
  return stringifyObjet(obj);
};

const prepareExportObject = (caseData: any) => {
  return {
    caseId: caseData.caseId,
    createdAt: caseData.createdAt.toISOString(),
    updatedAt: caseData.updatedAt.toISOString(),
    projectId: caseData.projectId,
    latestRevision: caseData.latestRevision
  };
};
