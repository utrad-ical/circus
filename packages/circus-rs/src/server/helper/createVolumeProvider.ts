import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import {
  DicomImageExtractor,
  DicomMetadata
} from '../../common/dicomImageExtractor';
import {
  Initializer as MultiRangeInitializer,
  MultiRange
} from 'multi-integer-range';
import RawData from '../../common/RawData';
import PriorityIntegerCaller from '../../common/PriorityIntegerCaller';
import DicomVolume from '../../common/DicomVolume';

export type VolumeProvider = (seriesUid: string) => Promise<VolumeAccessor>;

/**
 * VolumeAccessor is a set of data which loadVolumeProvider middleware
 * creates and injects to Koa's context.
 */
export interface VolumeAccessor {
  imageMetadata: Map<number, DicomMetadata>;
  volume: RawData;
  load: (range: MultiRangeInitializer, priority?: number) => Promise<void>;
  images: MultiRange;
}

/**
 * Creates a priority loader that can be injected to Koa's context.
 * @param repository Bound DICOM file repository.
 * @param extractor Bound DicomImageExtractor.
 */
export function createVolumeProvider(
  repository: DicomFileRepository,
  extractor: DicomImageExtractor
): VolumeProvider {
  return async seriesUid => {
    const { load, images } = await repository.getSeries(seriesUid);
    const imageRange = new MultiRange(images);

    if (imageRange.segmentLength() === 0)
      throw new Error(`Series '${seriesUid}' could not be loaded.`);

    // Create map of image-no to data-index(as z index on the volume).
    const zIndices: Map<number, number> = new Map();
    imageRange.toArray().forEach((no, idx) => zIndices.set(no, idx));

    // Collect each image metadata on fetched.
    const imageMetadata: Map<number, DicomMetadata> = new Map();
    const fetch = async (imageNo: number) => {
      const unparsedBuffer = await load(imageNo);
      const { metadata, pixelData } = extractor(unparsedBuffer);
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

    return {
      load: (range: MultiRangeInitializer, priority: number = 0) => {
        if (!imageRange.has(range)) throw new RangeError('Invalid image range');
        priorityLoader.append(range, priority);
        return priorityLoader.waitFor(range);
      },
      imageMetadata,
      volume,
      images: imageRange
    };
  };
}
