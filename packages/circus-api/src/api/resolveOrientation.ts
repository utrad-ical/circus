import { DicomFileRepository } from '@utrad-ical/circus-lib';
import { DicomTagReader } from '../interface';
import PartialVolumeDescriptor from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';

/**
 * Determines whether the given series (or its subset)
 * is head-first or foot-first, and returns the appropreate
 * PartialVolumeDescriptor.
 */

const resolveOrientation = async (
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
  const image1 = await series.load(1);
  const image2 = await series.load(2);
  const image1Tags = await dicomTagReader(image1);
  const image2Tags = await dicomTagReader(image2);

  if (!image1Tags.ImagePositionPatientZ) {
    return { start, end, delta: 1 } as PartialVolumeDescriptor;
  }
  if (image1Tags.ImagePositionPatientZ > image2Tags.ImagePositionPatientZ!) {
    return { start, end, delta: 1 } as PartialVolumeDescriptor;
  } else {
    return { start: end, end: start, delta: -1 } as PartialVolumeDescriptor;
  }
};

export default resolveOrientation;
