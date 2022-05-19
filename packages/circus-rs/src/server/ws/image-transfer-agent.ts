import { PartialVolumeDescriptor, partialVolumeDescriptorToArray } from '@utrad-ical/circus-lib';
import PriorityIntegerQueue from '../../common/PriorityIntegerQueue';
import { MultiRange } from 'multi-integer-range';
import { MultiRangeDescriptor } from '../../common/ws/types';
import { TransferImageMessage, transferImageMessageData } from '../../common/ws/message';
import { createDummyBuffer, dummyVolume } from '../../ws-temporary-config';
import { DicomFileRepository } from '@utrad-ical/circus-lib';
import { DicomExtractorWorker } from '../helper/extractor-worker/createDicomExtractorWorker';
import { console_log } from '../../debug';

export type ImageTransferAgent = ReturnType<typeof createImageTransferAgent>;

interface ImageDataEmitter {
  (data: TransferImageMessage, buffer: ArrayBuffer): Promise<void>;
}

type LoadingItem = {
  fetch: (image: number) => Promise<ArrayBuffer>;
  queue: PriorityIntegerQueue;
  startTime: number; // :DEBUG
}

const createImageTransferAgent = (
  imageDataEmitter: ImageDataEmitter,
  dicomFileRepository: DicomFileRepository,
  dicomExtractorWorker: DicomExtractorWorker,
  { connectionId }: { connectionId?: number; } = {} // :DEBUG
) => {

  const collection = new Map<string, LoadingItem>();

  let inOperation = false;

  const next = async () => {
    inOperation = true;
    const loaderIds = Array.from(collection.keys());
    if (loaderIds.length === 0) {
      inOperation = false;
      return;
    }

    while (0 < loaderIds.length) {
      const transferId = loaderIds.shift()!;

      if (!collection.has(transferId)) {
        console_log(`No handler for tr#${transferId} con#${connectionId}`);
        continue;
      }

      const { queue, fetch, startTime } = collection.get(transferId)!;
      const imageNo = queue.shift();

      if (imageNo !== undefined) {
        try {
          const data = transferImageMessageData(transferId, imageNo);
          const buffer = createDummyBuffer ? (createDummyBuffer as any)() : await fetch(imageNo);
          await imageDataEmitter(data, buffer);
          console_log(`Success to emit image#${imageNo} for tr#${transferId} con#${connectionId}`);
        } catch (err) {
          console_log(`Failed to emit image#${imageNo} for tr#${transferId} con#${connectionId}: ${(err as Error).message}`);
          collection.delete(transferId);
        }
      } else {
        console_log(`Complete tr#${transferId} con#${connectionId} in ${new Date().getTime() - startTime} [ms]`);
        collection.delete(transferId);
      }
    }
    next();
  };

  const beginTransfer = async (
    transferId: string,
    seriesUid: string,
    partialVolumeDescriptor?: PartialVolumeDescriptor,
    skip: MultiRangeDescriptor = []
  ) => {

    console_log(`${connectionId}: call stopTransfer @beginTransfer`);
    stopTransfer(transferId);

    // @TODO: check if the specified seriesUid is valid
    if (seriesUid !== dummyVolume.seriesUid) return;

    const { load, images } = await dicomFileRepository.getSeries(seriesUid);

    const fetch = async (imageNo: number) => {
      const unparsedBuffer = await load(imageNo);
      const { pixelData } = await dicomExtractorWorker(unparsedBuffer);
      return pixelData!;
    };

    const queue = new PriorityIntegerQueue;
    const targetImageNumbers = partialVolumeDescriptor
      ? partialVolumeDescriptorToArray(partialVolumeDescriptor)
      : images;
    const targets = new MultiRange(targetImageNumbers).subtract(skip);
    queue.append(targets);

    const startTime = new Date().getTime();
    collection.set(transferId, { fetch, queue, startTime });

    if (!inOperation) next();
  };

  const setPriority = (transferId: string, target: MultiRangeDescriptor, priority: number) => {
    const queue = collection.get(transferId)?.queue;
    if (queue) {
      const targetRange = new MultiRange(target).intersect(
        queue.entireRange()
      );
      if (0 < targetRange.segmentLength()) {
        queue.append(targetRange, priority);
      }
    }
  };

  const stopTransfer = (transferId: string) => {
    if (collection.has(transferId)) {
      collection.delete(transferId);
      console_log(`Accept stopTransfer for tr#${transferId} con#${connectionId}`);
    }
  };

  const dispose = () => {
    collection.clear();
  };

  return { beginTransfer, setPriority, stopTransfer, dispose };
}

export default createImageTransferAgent;
