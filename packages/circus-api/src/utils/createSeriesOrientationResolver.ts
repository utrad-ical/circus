import { DicomFileRepository, FunctionService } from '@utrad-ical/circus-lib';
import PartialVolumeDescriptor from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import { DicomTagReader } from 'interface';

export type SeriesOrientationResolver = (
  seriesUid: string,
  start: number,
  end: number
) => Promise<PartialVolumeDescriptor>;

interface Deps {
  dicomTagReader: DicomTagReader;
  dicomFileRepository: DicomFileRepository;
}

/**
 * Determines whether the given series (or its subset)
 * is head-first or foot-first, and returns the appropreate
 * PartialVolumeDescriptor.
 */
export const resolveSeriesOrientation = async (
  seriesUid: string,
  start: number,
  end: number,
  { dicomFileRepository, dicomTagReader }: Deps
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

const createSeriesOrientationResolver: FunctionService<
  SeriesOrientationResolver,
  Deps
> = async (_, deps) => {
  return async (seriesUid: string, start: number, end: number) => {
    return await resolveSeriesOrientation(seriesUid, start, end, deps);
  };
};

createSeriesOrientationResolver.dependencies = [
  'dicomTagReader',
  'dicomFileRepository'
];

export default createSeriesOrientationResolver;
