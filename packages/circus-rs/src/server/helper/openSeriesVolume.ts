import type { DicomFileRepository } from '@utrad-ical/circus-lib';
import * as mr from 'multi-integer-range';
import type { DicomMetadata } from '../../dicom/dicomImageExtractor.ts';
import type { Vector3D } from '../../volume/generateMhdHeader.ts';
import type PartialVolumeDescriptor from '../../volume/PartialVolumeDescriptor.ts';
import { partialVolumeDescriptorToArray } from '../../volume/PartialVolumeDescriptor.ts';
import { type PixelFormat, pixelFormatInfo } from '../../volume/PixelFormat.ts';
import type { DicomExtractorWorker } from './extractor-worker/createDicomExtractorWorker.ts';

export interface SeriesVolumeMetadata {
  /** [columns, rows, number of slices] */
  dimension: Vector3D;
  pixelFormat: PixelFormat;
  /** Pixel spacing and slice spacing in mm */
  elementSpacing: Vector3D;
  /** The image numbers of the slices, in the order of the slices */
  imageNumbers: number[];
}

export interface SeriesVolume {
  metadata: SeriesVolumeMetadata;
  /** Pixel data, one chunk per slice */
  slices: ReadableStream<Uint8Array>;
}

/**
 * Determines the slice spacing of a volume from its first two slices.
 * @param delta The step between the image numbers of adjacent slices.
 */
export const determineSliceSpacing = (
  first: DicomMetadata,
  second: DicomMetadata | undefined,
  delta: number
): number => {
  // (0018,0088) must not be negative, but some devices write negative values
  if (first.pitch) return Math.abs(first.pitch) * Math.abs(delta);
  // The two slices are already `delta` apart
  if (
    second &&
    typeof first.sliceLocation === 'number' &&
    typeof second.sliceLocation === 'number'
  )
    return Math.abs(second.sliceLocation - first.sliceLocation);
  return 1;
};

// Same as `ReadableStream.from`, which the DOM typings lack.
// The default high water mark reads one slice ahead
const toStream = <T>(iterator: AsyncGenerator<T>) =>
  new ReadableStream<T>({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel() {
      await iterator.return(undefined);
    }
  });

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status, expose: true });

/**
 * Opens a series as a volume whose slices are read one by one on demand.
 * Unlike `volumeProvider`, nothing is cached.
 * @param pvd The partial volume to read; all the images if omitted.
 */
const openSeriesVolume = async (
  deps: {
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
  },
  seriesUid: string,
  pvd?: PartialVolumeDescriptor
): Promise<SeriesVolume> => {
  const { dicomFileRepository, dicomExtractorWorker } = deps;
  const { load, images } = await dicomFileRepository.getSeries(seriesUid);
  const range = mr.parse(images);
  if (!range.length)
    throw httpError(404, `Series '${seriesUid}' could not be loaded.`);

  const imageNumbers = pvd
    ? partialVolumeDescriptorToArray(pvd)
    : mr.flatten(range);
  if (!mr.has(range, mr.normalize(imageNumbers)))
    throw httpError(400, 'The partial volume has images not in the series.');

  const extract = async (imageNo: number) => {
    const { metadata, pixelData } = await dicomExtractorWorker(
      await load(imageNo)
    );
    return { metadata, pixelData: new Uint8Array(pixelData!) };
  };

  const first = await extract(imageNumbers[0]);
  const { columns, rows, pixelFormat, pixelSpacing } = first.metadata;
  const sliceBytes = columns * rows * pixelFormatInfo(pixelFormat).bpp;

  const verify = (
    imageNo: number,
    slice: Awaited<ReturnType<typeof extract>>
  ) => {
    const { metadata, pixelData } = slice;
    if (metadata.columns !== columns || metadata.rows !== rows)
      throw new Error(`Image #${imageNo} has a different size.`);
    if (metadata.pixelFormat !== pixelFormat)
      throw new Error(`Image #${imageNo} has a different pixel format.`);
    if (pixelData.byteLength !== sliceBytes)
      throw new Error(`Image #${imageNo} has unexpected pixel data length.`);
  };

  verify(imageNumbers[0], first);
  const second =
    imageNumbers.length > 1 ? await extract(imageNumbers[1]) : undefined;
  if (second) verify(imageNumbers[1], second);

  const generate = async function* () {
    yield first.pixelData;
    if (!second) return;
    yield second.pixelData;
    for (const imageNo of imageNumbers.slice(2)) {
      const slice = await extract(imageNo);
      verify(imageNo, slice);
      yield slice.pixelData;
    }
  };

  return {
    metadata: {
      dimension: [columns, rows, imageNumbers.length],
      pixelFormat,
      elementSpacing: [
        pixelSpacing[0],
        pixelSpacing[1],
        determineSliceSpacing(first.metadata, second?.metadata, pvd?.delta ?? 1)
      ],
      imageNumbers
    },
    slices: toStream(generate())
  };
};

export default openSeriesVolume;
