import { VolumeAccessor } from '../../helper/createVolumeProvider';
import DicomVolume from '../../../common/DicomVolume';
import PartialVolumeDescriptor from '@utrad-ical/circus-lib/lib/PartialVolumeDescriptor';

export default async function createPartialVolume(
  volumeAccessor: VolumeAccessor,
  partialVolumeDescriptor: PartialVolumeDescriptor,
  loadPriority: number = 0
): Promise<DicomVolume> {
  const { volume, imageMetadata, load } = volumeAccessor;
  let loadImages: number[] = [];
  const { start, end, delta } = partialVolumeDescriptor;
  for (let i = start; i <= end; i += delta) {
    loadImages.push(i);
  }
  await load(loadImages, loadPriority); // set higher priority and wait for loaded.
  const { columns, rows, pixelFormat } = imageMetadata.get(start)!;
  const partialVolume = new DicomVolume(
    [columns, rows, loadImages.length],
    pixelFormat
  );

  let z = 0;
  loadImages.forEach(i =>
    partialVolume.insertSingleImage(z++, volume.getSingleImage(i))
  );

  return partialVolume;
}
