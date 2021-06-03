import { VolumeAccessor } from '../../helper/createVolumeProvider';
import DicomVolume from '../../../common/DicomVolume';
import {
  PartialVolumeDescriptor,
  partialVolumeDescriptorToArray
} from '@utrad-ical/circus-lib';

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
