import type { VolumeAccessor } from '../../helper/createVolumeProvider.ts';
import DicomVolume from '../../../common/DicomVolume.ts';
import type PartialVolumeDescriptor from '../../../volume/PartialVolumeDescriptor.ts';
import { partialVolumeDescriptorToArray } from '../../../volume/PartialVolumeDescriptor.ts';

export default async function createPartialVolume(
  volumeAccessor: VolumeAccessor,
  partialVolumeDescriptor: PartialVolumeDescriptor,
  loadPriority: number = 0
): Promise<DicomVolume> {
  const loadImages = partialVolumeDescriptorToArray(partialVolumeDescriptor);
  await volumeAccessor.load(loadImages, loadPriority); // set higher priority and wait for loaded.
  const { columns, rows, pixelFormat } = volumeAccessor.imageMetadata.get(
    partialVolumeDescriptor.start
  )!;
  const partialVolume = new DicomVolume(
    [columns, rows, loadImages.length],
    pixelFormat
  );

  let z = 0;
  loadImages.forEach(i =>
    partialVolume.insertSingleImage(
      z++,
      volumeAccessor.volume.getSingleImage(volumeAccessor.zIndices.get(i)!)
    )
  );

  return partialVolume;
}
