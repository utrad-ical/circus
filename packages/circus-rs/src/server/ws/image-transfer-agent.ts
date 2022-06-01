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

type TransferConnection = {
  fetch: (image: number) => Promise<ArrayBuffer>;
  queue: PriorityIntegerQueue;
  targets: MultiRange;
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
      const imageNo = queue.shift();

      if (imageNo !== undefined) {
        try {
          console.log(`Try to emit image#${imageNo} for tr#${transferId} con#${connectionId}`);
          const data = transferImageMessageData(transferId, imageNo);
          const buffer = await fetch(imageNo);
          await imageDataEmitter(data, buffer);
          //          console_log(`Success to emit image#${imageNo} for tr#${transferId} con#${connectionId}`);
        } catch (err) {
          console_log(`Failed to emit image#${imageNo} for tr#${transferId} con#${connectionId}: ${(err as Error).message}`);
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
    const {
      // imageMetadata,
      volume, //: RawData;
      load, //: (range: MultiRangeInitializer, priority?: number) => Promise<void>;
      zIndices, //: Map<number, number>; Maps an image number to the corresponding zero-based volume z-index
      // determinePitch, // : () => Promise<number>;
      images, //: MultiRange;
      // isLike3d, //: () => Promise<boolean>;
    } = await volumeProvider(seriesUid);

    const fetch = async (imageNo: number) => {
      await load(imageNo, 1);
      const z = zIndices.get(imageNo)!;
      return volume.getSingleImage(z);
    };

    const targets = partialVolumeDescriptor
      ? new MultiRange(partialVolumeDescriptorToArray(partialVolumeDescriptor))
      : images;

    const queue = new PriorityIntegerQueue;
    queue.append(targets);

    const setPriority = (target: MultiRangeDescriptor, priority: number) => {
      const targetRange = new MultiRange(target).intersect(targets);
      if (0 < targetRange.segmentLength()) queue.append(targetRange, priority);
    };

    const startTime = new Date().getTime();
    transferConnections.set(transferId, {
      fetch,
      queue,
      startTime,
      targets,
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
