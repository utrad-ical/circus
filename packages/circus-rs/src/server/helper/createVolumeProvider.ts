import {
  DicomFileRepository,
  DicomMetadata,
  FunctionService
} from '@utrad-ical/circus-lib';
import {
  MultiRangeInitializer,
  MultiRange
} from 'multi-integer-range';
import asyncMemoize from '../../common/asyncMemoize';
import DicomVolume from '../../common/DicomVolume';
import PriorityIntegerCaller from '../../common/PriorityIntegerCaller';
import RawData from '../../common/RawData';
import { DicomExtractorWorker } from './extractor-worker/createDicomExtractorWorker';

export type VolumeProvider = (seriesUid: string) => Promise<VolumeAccessor>;

/**
 * VolumeAccessor is a set of data which loadVolumeProvider middleware
 * creates and injects to Koa's context.
 */
export interface VolumeAccessor {
  imageMetadata: Map<number, DicomMetadata>;
  volume: RawData;
  load: (range: MultiRangeInitializer, priority?: number) => Promise<void>;
  /**
   * Maps an image number to the corresponding zero-based volume z-index
   */
  zIndices: Map<number, number>;
  determinePitch: () => Promise<number>;
  images: MultiRange;
  isLike3d: () => Promise<boolean>;
}

interface OptionsWithoutCache {
  maxConcurrency?: number;
}

/**
 * Creates a priority loader that can be injected to Koa's context.
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
    const imageRange = new MultiRange(images);

    if (imageRange.segmentLength() === 0) {
      const err = new Error(`Series '${seriesUid}' could not be loaded.`);
      err.status = 404;
      err.expose = true;
      throw err;
    }

    // Create map of image-no to data-index (as z index on the volume).
    const zIndices: Map<number, number> = new Map();
    imageRange.toArray().forEach((no, idx) => zIndices.set(no, idx));

    // Collect each image metadata on fetched.
    const imageMetadata: Map<number, DicomMetadata> = new Map();
    const fetch = async (imageNo: number) => {
      const unparsedBuffer = await load(imageNo);
      const { metadata, pixelData } = await dicomExtractorWorker(
        unparsedBuffer
      );
      imageMetadata.set(imageNo, metadata);
      return pixelData!;
    };

    // Fetch first data to get columns and rows.
    const topImageNo = imageRange.min()!;
    const topImagePixelData = await fetch(topImageNo);
    const { columns, rows, pixelFormat } = imageMetadata.get(topImageNo)!;

    // Create volume
    const volume = new DicomVolume(
      [columns, rows, imageRange.length()],
      pixelFormat
    );
    volume.insertSingleImage(zIndices.get(topImageNo)!, topImagePixelData);

    // Prepare image loader
    const processor = async (imageNo: number) => {
      const buffer = await fetch(imageNo);
      const metadata = imageMetadata.get(imageNo)!;
      verifyMetadata(metadata);

      volume.insertSingleImage(zIndices.get(imageNo)!, buffer);
    };
    const priorityLoader = new PriorityIntegerCaller(processor, {
      initialResolved: topImageNo,
      maxConcurrency
    });

    // start loading immediately
    priorityLoader.append(images);

    const loadSeries = (range: MultiRangeInitializer, priority: number = 0) => {
      if (!imageRange.has(range)) throw new RangeError('Invalid image range');
      priorityLoader.append(range, priority);
      return priorityLoader.waitFor(range);
    };

    const determinePitch = async () => {
      const images = imageRange.clone();
      const count = images.length();

      const primaryImageNo = images.shift()!;
      await load(primaryImageNo);
      const primaryMetadata = imageMetadata.get(primaryImageNo)!;

      if (primaryMetadata.pitch) {
        return primaryMetadata.pitch;
      } else if (count > 1) {
        const secondaryImageNo = images.shift()!;
        await load(secondaryImageNo);
        const secondaryMetadata = imageMetadata.get(secondaryImageNo)!;
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
      const images = imageRange.clone();
      const count = images.length();

      // primary image
      const primaryImageNo = images.shift()!;
      await load(primaryImageNo);
      const primaryMetadata = imageMetadata.get(primaryImageNo)!;
      const checkPrimaryImage = determineIf3dImageFromMetadata(primaryMetadata);
      if (count === 1) {
        return checkPrimaryImage;
      }

      // secondary image
      const secondaryImageNo = images.shift()!;
      await load(secondaryImageNo);
      const secondaryMetadata = imageMetadata.get(secondaryImageNo)!;
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
        ? metadata => {
          if (
            !determineIf3dImageFromMetadata(metadata) ||
            imageOrientationPatient !== metadata.imageOrientationPatient
          )
            throw new Error('Contains image that do not look like 3d image.');
        }
        : undefined;

      return like3d;
    };

    let verifyMetadataOf3dImage:
      | undefined
      | ((metadata: DicomMetadata) => void) = undefined;

    const verifyMetadata = async (metadata: DicomMetadata) => {
      // primary image
      const images = imageRange.clone();
      const primaryImageNo = images.shift()!;
      await load(primaryImageNo);
      const primaryMetadata = imageMetadata.get(primaryImageNo)!;

      // Check: Size
      if (
        primaryMetadata.columns != metadata.columns ||
        primaryMetadata.rows != metadata.rows
      ) {
        throw new Error('Size is different.');
      }

      // Check: Pixel format
      if (primaryMetadata.pixelFormat != metadata.pixelFormat) {
        throw new Error('Pixel format is different.');
      }

      // Check: 3D Image
      if (verifyMetadataOf3dImage) verifyMetadataOf3dImage(metadata);
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
    maxAge?: number;
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
  const { memoryThreshold = 2147483648, maxAge = 3600 } = cacheOpts;
  return asyncMemoize(rawVolumeProvider, {
    max: memoryThreshold,
    maxAge: maxAge * 1000,
    length: accessor => accessor.volume.data.byteLength
  });
};

createVolumeProvider.dependencies = [
  'dicomFileRepository',
  'dicomExtractorWorker'
];

export default createVolumeProvider;
