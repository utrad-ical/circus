import { VolumeAccessor } from '../../helper/createVolumeProvider';
import DicomVolume from '../../../common/DicomVolume';
import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';

export default async function createPartialVolume(
  volumeAccessor: VolumeAccessor,
  partialVolumeDescriptor: PartialVolumeDescriptor,
  loadPriority: number = 0
): Promise<DicomVolume> {
  const loadImages: number[] = [];
  const { start, end, delta } = partialVolumeDescriptor;
  for (let i = start; i <= end; i += delta) {
    loadImages.push(i);
  }
  await volumeAccessor.load(loadImages, loadPriority); // set higher priority and wait for loaded.
  const { columns, rows, pixelFormat } = volumeAccessor.imageMetadata.get(
    start
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
