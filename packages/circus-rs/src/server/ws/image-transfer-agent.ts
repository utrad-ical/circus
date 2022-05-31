import { PartialVolumeDescriptor, partialVolumeDescriptorToArray } from '@utrad-ical/circus-lib';
import PriorityIntegerQueue from '../../common/PriorityIntegerQueue';
import { MultiRange } from 'multi-integer-range';
import { MultiRangeDescriptor } from '../../common/ws/types';
import { TransferImageMessage, transferImageMessageData } from '../../common/ws/message';
import { console_log } from '../../debug';
import { VolumeProvider } from '../helper/createVolumeProvider';

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
  { imageDataEmitter, volumeProvider, connectionId }: {
    imageDataEmitter: ImageDataEmitter,
    volumeProvider: VolumeProvider,
    connectionId?: number;// :DEBUG
  }) => {

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
          const buffer = await fetch(imageNo);
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

    const {
      // imageMetadata,
      volume, //: RawData;
      load, //: (range: MultiRangeInitializer, priority?: number) => Promise<void>;
      zIndices, //: Map<number, number>; Maps an image number to the corresponding zero-based volume z-index
      // determinePitch, // : () => Promise<number>;
      images, //: MultiRange;
      // isLike3d, //: () => Promise<boolean>;
    } = await volumeProvider(seriesUid, { startLoadingImmediately: false });

    const fetch = async (imageNo: number) => {
      await load(imageNo, 1);
      const z = zIndices.get(imageNo)!;
      return volume.getSingleImage(z);
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
