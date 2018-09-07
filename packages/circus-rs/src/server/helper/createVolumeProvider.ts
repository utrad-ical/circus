import { DicomFileRepository } from '@utrad-ical/circus-dicom-repository';
import {
  Extractor,
  DicomMetadata,
  DicomImageData
} from '../../common/dicomImageExtractor';
import LRU from 'lru-cache';
import {
  Initializer as MultiRangeInitializer,
  MultiRange
} from 'multi-integer-range';
import RawData from '../../common/RawData';
import PriorityIntegerCaller from '../../common/PriorityIntegerCaller';
import DicomVolume from '../../common/DicomVolume';

export type VolumeProvider = (seriesUID: string) => Promise<VolumeAccessor>;

export interface VolumeAccessor {
  imageMetadata: Map<number, DicomMetadata>;
  volume: RawData;
  load: (range: MultiRangeInitializer, priority?: number) => Promise<void>;
  images: MultiRange;
}

export function createVolumeProvider(
  repository: DicomFileRepository,
  extractor: Extractor<DicomImageData>
): VolumeProvider {
  return async seriesUID => {
    const { load, images } = await repository.getSeries(seriesUID);
    const imageRange = new MultiRange(images);

    if (imageRange.length() === 0) throw new Error('Invalid repository');

    // Create map of image-no to data-index(as z index on the volume).
    const zIndices: Map<number, number> = new Map();
    imageRange.toArray().forEach((no, idx) => zIndices.set(no, idx));

    // Collect each image metadata on fetched.
    const imageMetadata: Map<number, DicomMetadata> = new Map();
    const fetch = async (imageNo: number) => {
      const unparsedBuffer = await load(imageNo);
      const { metadata, pixelData } = await extractor(unparsedBuffer);
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
