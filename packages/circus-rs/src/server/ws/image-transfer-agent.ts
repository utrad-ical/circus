import { PartialVolumeDescriptor, partialVolumeDescriptorToArray } from '@utrad-ical/circus-lib';
import PriorityIntegerQueue from '../../common/PriorityIntegerQueue';
import { MultiRange } from 'multi-integer-range';
import { MultiRangeDescriptor } from '../../common/ws/types';
import { TransferImageMessage, transferImageMessageData } from '../../common/ws/message';
import { console_log } from '../../debug';
import { VolumeProvider } from '../helper/createVolumeProvider';

const PARTIAL_VOLUME_PRIORITY = 1;

export type ImageTransferAgent = ReturnType<typeof createImageTransferAgent>;

interface ImageDataEmitter {
  (data: TransferImageMessage, buffer: ArrayBuffer): Promise<void>;
}

type TransferConnection = {
  fetch: (image: number) => Promise<ArrayBuffer>;
  queue: PriorityIntegerQueue;
  startTime: number; // :DEBUG
  setPriority: (target: MultiRangeDescriptor, priority: number) => void;
};

const createImageTransferAgent = (
  { imageDataEmitter, volumeProvider, connectionId }: {
    imageDataEmitter: ImageDataEmitter;
    volumeProvider: VolumeProvider;
    connectionId?: number;// :DEBUG
  }) => {

  const transferConnections = new Map<string, TransferConnection>();

  let inOperation = false;

  const next = async () => {

    if (transferConnections.size === 0) {
      inOperation = false;
      return;
    }

    const transferIds = Array.from(transferConnections.keys());

    while (0 < transferIds.length) {
      const transferId = transferIds.shift()!;

      const connection = transferConnections.get(transferId);

      if (!connection) {
        console_log(`No handler for tr#${transferId} con#${connectionId}`);
        continue;
      }

      const { queue, fetch, startTime } = connection;
      const imageIndex = queue.shift();

      if (imageIndex !== undefined) {
        try {
          // console_log(`Try to emit image#${imageIndex} for tr#${transferId} con#${connectionId}`);
          const data = transferImageMessageData(transferId, imageIndex);
          const buffer = await fetch(imageIndex);
          await imageDataEmitter(data, buffer);
          console_log(`Success to emit image#${imageIndex} for tr#${transferId} con#${connectionId}`);
        } catch (err) {
          console_log(`Failed to emit image#${imageIndex} for tr#${transferId} con#${connectionId}: ${(err as Error).message}`);
          transferConnections.delete(transferId);
        }
      } else {
        console_log(`Complete tr#${transferId} con#${connectionId} in ${new Date().getTime() - startTime} [ms]`);
        transferConnections.delete(transferId);
      }
    }
    setImmediate(next);
  };

  const beginTransfer = async (
    transferId: string,
    seriesUid: string,
    partialVolumeDescriptor?: PartialVolumeDescriptor
  ) => {
    const { volume, load, images } = await volumeProvider(seriesUid);

    // Maps a zero-based volume z-index to the corresponding image number,
    // The number is the number to be specified when call load() function.
    const zIndices = new Map<number, number>();

    if (partialVolumeDescriptor) {
      const partialImages = partialVolumeDescriptorToArray(partialVolumeDescriptor);

      // Set zIndices for the partial volume.
      partialImages.forEach((v, i) => zIndices.set(i, v));

      // Set higher priority to the images in partial volume.
      load(partialImages, PARTIAL_VOLUME_PRIORITY);
    } else {
      // Set zIndices for the entire volume.
      images.toArray().forEach((v, i) => zIndices.set(i, v));
    }

    const imageIndices = Array.from(zIndices.keys());

    const fetch = async (zIndex: number) => {
      const imageNo = zIndices.get(zIndex);
      // console.log(`zIndex: ${zIndex} => #${imageNo}`);
      if (!imageNo) throw new Error('Invalid image request');
      await load(imageNo);
      return volume.getSingleImage(imageNo - 1);
    };

    const queue = new PriorityIntegerQueue;
    queue.append(imageIndices);

    const setPriority = (target: MultiRangeDescriptor, priority: number) => {
      const targetRange = new MultiRange(target).intersect(imageIndices);
      if (0 < targetRange.segmentLength()) queue.append(targetRange, priority);
    };

    const startTime = new Date().getTime();
    transferConnections.set(transferId, {
      fetch,
      queue,
      startTime,
      setPriority
    });

    if (!inOperation) {
      inOperation = true;
      setImmediate(next);
    };
  };

  const setPriority = (transferId: string, target: MultiRangeDescriptor, priority: number) => {
    transferConnections.get(transferId)?.setPriority(target, priority);
  };

  const stopTransfer = (transferId: string) => {
    if (transferConnections.has(transferId)) {
      transferConnections.delete(transferId);
      console_log(`Accept stopTransfer for tr#${transferId} con#${connectionId}`);
    }
  };

  const dispose = () => {
    transferConnections.clear();
  };

  return { beginTransfer, setPriority, stopTransfer, dispose };
}

export default createImageTransferAgent;
