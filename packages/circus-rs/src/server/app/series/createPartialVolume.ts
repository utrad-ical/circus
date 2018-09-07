import { VolumeAccessor } from '../../helper/createVolumeProvider';
import { SubVolumeDescriptor } from './seriesRoutes';
import DicomVolume from '../../../common/DicomVolume';

export default async function createPartialVolume(
  volumeAccessor: VolumeAccessor,
  subVolumeDescriptor: SubVolumeDescriptor,
  loadPriority: number = 0
): Promise<DicomVolume> {
  const { volume, imageMetadata, load } = volumeAccessor;
  let loadImages: number[] = [];
  const { start, end, delta } = subVolumeDescriptor;
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
