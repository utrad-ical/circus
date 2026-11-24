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
 * Determines the slice spacing of a volume from its first two slices,
 * in the same way as the viewer (`determinePitch` of the volume provider).
 * The spacing tag is used as is even for a partial volume, which is
 * mostly used to pick up one of interleaved series.
 */
export const determineSliceSpacing = (
  first: DicomMetadata,
  second: DicomMetadata | undefined
): number => {
  // (0018,0088) must not be negative, but some devices write negative values
  if (first.pitch) return Math.abs(first.pitch);
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
 * @param onSlice Called with the DICOM file of each slice when it is read,
 *   in the order of the slices.
 */
const openSeriesVolume = async (
  deps: {
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
  },
  seriesUid: string,
  pvd?: PartialVolumeDescriptor,
  onSlice?: (imageNo: number, dicom: ArrayBuffer) => void | Promise<void>
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
    const dicom = await load(imageNo);
    await onSlice?.(imageNo, dicom);
    const { metadata, pixelData } = await dicomExtractorWorker(dicom);
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
        // Pixel Spacing is in the order of rows (y) and columns (x)
        pixelSpacing[1],
        pixelSpacing[0],
        determineSliceSpacing(first.metadata, second?.metadata)
      ],
      imageNumbers
    },
    slices: toStream(generate())
  };
};

export default openSeriesVolume;
