import { DicomFileRepository } from '@utrad-ical/circus-lib';
import { DicomTagReader } from '../interface';
import PartialVolumeDescriptor from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';

/**
 * Determines whether the given series (or its subset)
 * is head-first or foot-first, and returns the appropreate
 * PartialVolumeDescriptor.
 */

const resolveSeriesOrientation = async (
  seriesUid: string,
  start: number,
  end: number,
  {
    dicomFileRepository,
    dicomTagReader
  }: {
    dicomFileRepository: DicomFileRepository;
    dicomTagReader: DicomTagReader;
  }
) => {
  const isAscendingOrder = start <= end ? true : false;

  const series = await dicomFileRepository.getSeries(seriesUid);
  if (series.images === '1') {
    return { start, end, delta: 1 } as PartialVolumeDescriptor;
  }

  let startImage: ArrayBuffer, endImage: ArrayBuffer;
  try {
    startImage = await series.load(start);
    endImage = await series.load(end);
  } catch (err) {
    throw new Error('no image');
  }

  const startImageTags = await dicomTagReader(startImage);
  const endImageTags = await dicomTagReader(endImage);

  if (
    !startImageTags.parameters.imagePositionPatientZ ||
    !endImageTags.parameters.imagePositionPatientZ
  )
    throw new Error('invalid image');
  if (
    startImageTags.parameters.imagePositionPatientZ >=
    endImageTags.parameters.imagePositionPatientZ
  ) {
    return isAscendingOrder
      ? ({ start, end, delta: 1 } as PartialVolumeDescriptor)
      : ({ start: end, end: start, delta: -1 } as PartialVolumeDescriptor);
  } else {
    return isAscendingOrder
      ? ({ start: end, end: start, delta: -1 } as PartialVolumeDescriptor)
      : ({ start, end, delta: 1 } as PartialVolumeDescriptor);
  }
};

export default resolveSeriesOrientation;
