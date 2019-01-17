import JSZip from 'jszip';
import zeroPad from '../utils/zeroPad';
import { PixelFormat } from '@utrad-ical/circus-rs/src/common/PixelFormat';
import RawData from '@utrad-ical/circus-rs/src/common/RawData';

export const packAsMhd = async (deps, caseId) => {
  const zip = new JSZip();
  await putCaseData(deps, caseId, zip);
  return zip.generateNodeStream();
};

/**
 * Turns `3` to `'003'`, etc.
 * @param {number} num A nonnegative integer
 */
const pad = num => zeroPad(3, num);

/**
 * Inserts a single case data into a root zip foler or a subdirectory.
 * @param {JSZip} zip The JSZip root object or a subdirectory made by `folder`
 */
const putCaseData = async (deps, caseId, zip) => {
  const { models, volumeProvider, blobStorage } = deps;
  const caseData = await models.clinicalCase.findByIdOrFail(caseId);
  const rev = caseData.latestRevision;
  zip.file(
    `${caseId}.json`,
    JSON.stringify(prepareExportObject(caseData), null, '  ')
  );
  for (let volId = 0; volId < rev.series.length; volId++) {
    const series = rev.series[volId];
    const volumeAccessor = await volumeProvider(series.seriesUid);
    await volumeAccessor.load(volumeAccessor.images);
    const volume = volumeAccessor.volume;
    const primaryImageNo = volumeAccessor.images.min();
    const primaryMetadata = volumeAccessor.imageMetadata.get(primaryImageNo);
    const pitch = await volumeAccessor.determinePitch();
    const elementSpacing = [
      primaryMetadata.pixelSpacing[0],
      primaryMetadata.pixelSpacing[1],
      pitch
    ];

    const rawFileBaseName = `vol${pad(volId)}.raw`;
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
    for (let labelId = 0; labelId < series.labels.length; labelId++) {
      const label = series.labels[labelId];
      switch (label.type) {
        case 'voxel': {
          const labelFileBaseName = `vol${pad(volId)}-label${pad(labelId)}`;
          const hash = label.data.voxels;
          const labelBuffer = await blobStorage.read(hash);
          const labelVolume = createLabelVolume(
            dimension,
            label.data,
            labelBuffer
          );
          zip.file(labelFileBaseName + '.raw', labelVolume);
          zip.file(
            labelFileBaseName + '.mhd',
            prepareMhdHeaderAsString(
              PixelFormat.Binary,
              dimension,
              elementSpacing,
              labelFileBaseName + '.raw'
            )
          );
          break;
        }
      }
    }
  }
};

/**
 * Converts internal label format to (large) raw format
 */
const createLabelVolume = (dimension, labelData, labelBuffer) => {
  const vol = new RawData(dimension, PixelFormat.UInt8);
  const labelVol = new RawData(labelData.size, PixelFormat.Binary);
  labelVol.assign(labelBuffer.buffer);
  vol.copy(labelVol, undefined, labelData.origin);
  return vol.data;
};

const pixelFormatMap = {
  [PixelFormat.UInt8]: 'MET_UCHAR',
  [PixelFormat.Int8]: 'MET_CHAR',
  [PixelFormat.UInt16]: 'MET_USHORT',
  [PixelFormat.Int16]: 'MET_SHORT'
};

const prepareMhdHeaderAsString = (
  pixelFormat,
  dimSize,
  elementSpacing,
  elementDataFile
) => {
  const stringifyObjet = obj => {
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
  };
  return stringifyObjet(obj);
};

const prepareExportObject = caseData => {
  return {
    caseId: caseData.caseId,
    createdAt: caseData.createdAt.toISOString(),
    updatedAt: caseData.updatedAt.toISOString(),
    projectId: caseData.projectId,
    latestRevision: caseData.latestRevision
  };
};
