import type {
  DicomFileRepository,
  FunctionService
} from '@utrad-ical/circus-lib';
import type { DicomMetadata } from '../../dicom/dicomImageExtractor.ts';
import * as mr from 'multi-integer-range';
import asyncMemoize from '../../common/asyncMemoize.ts';
import DicomVolume from '../../common/DicomVolume.ts';
import PriorityIntegerCaller from '../../common/PriorityIntegerCaller.ts';
import type RawData from '../../common/RawData.ts';
import { type RangeInput, toRange } from '../../common/rangeInput.ts';
import type { DicomExtractorWorker } from './extractor-worker/createDicomExtractorWorker.ts';

export type VolumeProvider = (seriesUid: string) => Promise<VolumeAccessor>;

/**
 * VolumeAccessor is a set of data which loadVolumeProvider middleware
 * creates and injects into the request context.
 */
export interface VolumeAccessor {
  imageMetadata: Map<number, DicomMetadata>;
  volume: RawData;
  load: (range: RangeInput, priority?: number) => Promise<void>;
  /**
   * Maps an image number to the corresponding zero-based volume z-index
   */
  zIndices: Map<number, number>;
  determinePitch: () => Promise<number>;
  images: mr.MIR;
  isLike3d: () => Promise<boolean>;
}

interface OptionsWithoutCache {
  maxConcurrency?: number;
}

/**
 * Creates a priority loader for a DICOM series.
 */
const createUncachedVolumeProvider: FunctionService<
  VolumeProvider,
  {
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
  },
  OptionsWithoutCache
> = async (opts, deps) => {
  const { dicomFileRepository, dicomExtractorWorker } = deps;
  const { maxConcurrency = 32 } = opts;
  return async (seriesUid): Promise<VolumeAccessor> => {
    const { load, images } = await dicomFileRepository.getSeries(seriesUid);
    const imageRange = mr.parse(images);

    if (imageRange.length === 0) {
      // Does not rely on the global `Error` augmentation in src/typings,
      // which is not visible when other packages type-check this file
      throw Object.assign(
        new Error(`Series '${seriesUid}' could not be loaded.`),
        { status: 404, expose: true }
      );
    }

    // Create map of image-no to data-index (as z index on the volume).
    const zIndices: Map<number, number> = new Map();
    mr.flatten(imageRange).forEach((no, idx) => zIndices.set(no, idx));

    // Collect each image metadata on fetched.
    const imageMetadata: Map<number, DicomMetadata> = new Map();
    const fetch = async (imageNo: number) => {
      const unparsedBuffer = await load(imageNo);
      const { metadata, pixelData } =
        await dicomExtractorWorker(unparsedBuffer);
      imageMetadata.set(imageNo, metadata);
      return pixelData!;
    };

    // Fetch first data to get columns and rows.
    const topImageNo = mr.min(imageRange)!;
    const topImagePixelData = await fetch(topImageNo);
    const primaryMetadata = imageMetadata.get(topImageNo)!;
    const { columns, rows, pixelFormat } = primaryMetadata;

    // Create volume
    const volume = new DicomVolume(
      [columns, rows, mr.length(imageRange)],
      pixelFormat
    );
    volume.insertSingleImage(zIndices.get(topImageNo)!, topImagePixelData);

    // Prepare image loader
    const processor = async (imageNo: number) => {
      const buffer = await fetch(imageNo);
      verifyMetadata(imageNo, imageMetadata.get(imageNo)!);

      volume.insertSingleImage(zIndices.get(imageNo)!, buffer);
    };
    const priorityLoader = new PriorityIntegerCaller(processor, {
      initialResolved: topImageNo,
      maxConcurrency
    });

    // start loading immediately
    priorityLoader.append(imageRange);

    const loadSeries = (input: RangeInput, priority: number = 0) => {
      const range = toRange(input);
      if (!mr.has(imageRange, range))
        throw new RangeError('Invalid image range');
      priorityLoader.append(range, priority);
      return priorityLoader.waitFor(range);
    };

    /**
     * Waits until the metadata of the image is available.
     * The metadata is kept even if the image fails the verification.
     */
    const loadMetadata = async (imageNo: number) => {
      await loadSeries(imageNo).catch(() => {});
      const metadata = imageMetadata.get(imageNo);
      if (!metadata) throw new Error(`Failed to load image #${imageNo}.`);
      return metadata;
    };

    const determinePitch = async () => {
      const count = mr.length(imageRange);

      if (primaryMetadata.pitch) {
        // (0018,0088) must not be negative, but some devices write negative values
        return Math.abs(primaryMetadata.pitch);
      } else if (count > 1) {
        const secondaryMetadata = await loadMetadata(mr.at(imageRange, 1)!);
        return Math.abs(
          secondaryMetadata.sliceLocation! - primaryMetadata.sliceLocation!
        );
      } else {
        return 1;
      }
    };

    /**
     * Determines if the image is a "3D-like image" and returns it.
     * If the first two images in the subseries satisfy all of the following,
     * it will determine that they are "3D-like images" and return true.
     * - The modality is CT, MR or PT.
     * - Pixel format is monochrome.
     * - The orientation of the image written in the DICOM tag is the same for the first and the second image.
     * - DICOM tag does not have a flag that the image is a reconstructed image.
     * @returns True for "3D-like images"
     */
    const isLike3d = async () => {
      const count = mr.length(imageRange);

      // primary image
      const checkPrimaryImage = determineIf3dImageFromMetadata(primaryMetadata);
      if (count === 1) {
        return checkPrimaryImage;
      }

      // secondary image
      const secondaryMetadata = await loadMetadata(mr.at(imageRange, 1)!);
      const checkSecondaryImage =
        determineIf3dImageFromMetadata(secondaryMetadata);

      const checkImageOrientationPatient =
        primaryMetadata.imageOrientationPatient ===
        secondaryMetadata.imageOrientationPatient;

      // check
      const like3d =
        checkPrimaryImage &&
        checkSecondaryImage &&
        checkImageOrientationPatient;

      const imageOrientationPatient = primaryMetadata.imageOrientationPatient;

      verifyMetadataOf3dImage = like3d
        ? (imageNo, metadata) => {
            if (
              !determineIf3dImageFromMetadata(metadata) ||
              imageOrientationPatient !== metadata.imageOrientationPatient
            )
              throw userError(
                `Image #${imageNo} does not look like a part of the 3D volume ` +
                  'that the first images make.'
              );
          }
        : undefined;

      return like3d;
    };

    let verifyMetadataOf3dImage:
      | undefined
      | ((imageNo: number, metadata: DicomMetadata) => void) = undefined;

    // The messages are shown to the user
    const verifyMetadata = (imageNo: number, metadata: DicomMetadata) => {
      // Check: Size
      if (
        primaryMetadata.columns != metadata.columns ||
        primaryMetadata.rows != metadata.rows
      ) {
        throw userError(
          `Image #${imageNo} is ${metadata.columns}x${metadata.rows}, ` +
            `while the first image is ` +
            `${primaryMetadata.columns}x${primaryMetadata.rows}.`
        );
      }

      // Check: Pixel format
      if (primaryMetadata.pixelFormat != metadata.pixelFormat) {
        throw userError(
          `Image #${imageNo} has the pixel format ${metadata.pixelFormat}, ` +
            `while the first image has ${primaryMetadata.pixelFormat}.`
        );
      }

      // Check: 3D Image
      if (verifyMetadataOf3dImage) verifyMetadataOf3dImage(imageNo, metadata);
    };

    return {
      imageMetadata,
      volume,
      zIndices,
      load: loadSeries,
      determinePitch,
      images: imageRange,
      isLike3d
    };
  };
};

/** An error whose message can be shown to the user */
const userError = (message: string) =>
  Object.assign(new Error(message), { expose: true });

const determineIf3dImageFromMetadata = (metadata: DicomMetadata) => {
  // Check: The modality is CT, MR or PT.
  if (!['CT', 'MR', 'PT'].includes(metadata.modality)) {
    return false;
  }

  // Check: Pixel format is monochrome.
  if (metadata.pixelFormat === 'rgba8') {
    return false;
  }

  // Check: DICOM tag does not have a flag that the image is a reconstructed image.
  if (
    metadata.pixelDataCharacteristics &&
    metadata.pixelDataCharacteristics.match(/^DERIVED/)
  ) {
    return false;
  }

  // Passed all requirements.
  return true;
};

interface Options extends OptionsWithoutCache {
  cache?: {
    memoryThreshold?: number;
    ttl?: number;
  };
}

const createVolumeProvider: FunctionService<
  VolumeProvider,
  {
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
  },
  Options
> = async (opts, deps) => {
  const { cache: cacheOpts = {}, ...restOpts } = opts || {};
  const rawVolumeProvider = await createUncachedVolumeProvider(restOpts, deps);
  const { memoryThreshold = 2147483648, ttl = 3600 } = cacheOpts;
  return asyncMemoize(rawVolumeProvider, {
    maxSize: memoryThreshold,
    ttl: ttl * 1000,
    length: accessor => accessor.volume.data.byteLength
  });
};

createVolumeProvider.dependencies = [
  'dicomFileRepository',
  'dicomExtractorWorker'
];

export default createVolumeProvider;
