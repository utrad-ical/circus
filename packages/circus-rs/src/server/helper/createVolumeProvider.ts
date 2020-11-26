import {
  DicomFileRepository,
  DicomMetadata,
  FunctionService
} from '@utrad-ical/circus-lib';
import {
  Initializer as MultiRangeInitializer,
  MultiRange
} from 'multi-integer-range';
import RawData from '../../common/RawData';
import PriorityIntegerCaller from '../../common/PriorityIntegerCaller';
import DicomVolume from '../../common/DicomVolume';
import asyncMemoize from '../../common/asyncMemoize';
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
}

/**
 * Creates a priority loader that can be injected to Koa's context.
 */
const createUncachedVolumeProvider: FunctionService<
  VolumeProvider,
  {
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
  }
> = async (opts, deps) => {
  const { dicomFileRepository, dicomExtractorWorker } = deps;
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
      volume.insertSingleImage(zIndices.get(imageNo)!, buffer);
    };
    const priorityLoader = new PriorityIntegerCaller(processor, {
      resolved: topImageNo
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

    return {
      imageMetadata,
      volume,
      zIndices,
      load: loadSeries,
      determinePitch,
      images: imageRange
    };
  };
};

const createVolumeProvider: FunctionService<
  VolumeProvider,
  {
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
  }
> = async (opts, deps) => {
  const { cache: cacheOpts, ...restOpts } = opts || { cache: {} };
  const rawVolumeProvider = await createUncachedVolumeProvider(restOpts, deps);
  if (cacheOpts) {
    const { memoryThreshold = 2147483648, maxAge = 3600 } = cacheOpts;
    return asyncMemoize(rawVolumeProvider, {
      max: memoryThreshold,
      maxAge: maxAge * 1000,
      length: accessor => accessor.volume.data.byteLength
    });
  } else {
    return rawVolumeProvider;
  }
};

createVolumeProvider.dependencies = [
  'dicomFileRepository',
  'dicomExtractorWorker'
];

export default createVolumeProvider;
