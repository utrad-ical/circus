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
  if (start > end) throw new Error('invalid argument');

  const series = await dicomFileRepository.getSeries(seriesUid);
  if (series.images === '1') {
    return { start, end, delta: 1 } as PartialVolumeDescriptor;
  }
  const startImage = await series.load(start);
  const endImage = await series.load(end - start + 1);
  const startImageTags = await dicomTagReader(startImage);
  const endImageTags = await dicomTagReader(endImage);

  if (!startImageTags.parameters.imagePositionPatientZ) {
    return { start, end, delta: 1 } as PartialVolumeDescriptor;
  }
  if (
    startImageTags.parameters.imagePositionPatientZ >
    endImageTags.parameters.imagePositionPatientZ!
  ) {
    return { start, end, delta: 1 } as PartialVolumeDescriptor;
  } else {
    return { start: end, end: start, delta: -1 } as PartialVolumeDescriptor;
  }
};

export default resolveSeriesOrientation;
