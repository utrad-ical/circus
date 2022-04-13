import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import PriorityIntegerQueue from '../../common/PriorityIntegerQueue';
import { MultiRange } from 'multi-integer-range';
import { MultiRangeDescriptor } from '../../common/ws/types';
import { TransferImageMessage, transferImageMessageData } from '../../common/ws/message';
import { debugDummyWait, createDummyBuffer, dummyVolume } from '../../ws-temporary-config';

export type ImageTransferAgent = ReturnType<typeof createImageTransferAgent>;

interface Acceptor {
  (data: TransferImageMessage, buffer: ArrayBuffer): Promise<void>;
}

const createImageTransferAgent = (
  accept: Acceptor,
  { connectionId }: { connectionId?: number; } = {} // :DEBUG
) => {

  const collection = new Map<string, PriorityIntegerQueue>();
  const beginTransferAt = new Map<string, number>(); // :DEBUG

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
      const imageNo = collection.get(transferId)?.shift();
      if (imageNo !== undefined) {
        if (debugDummyWait) await (debugDummyWait as unknown as () => Promise<void>)(); // :DEBUG
        await transfer(transferId, imageNo);
      } else {
        const beginAt = beginTransferAt.get(transferId) || 0; // :DEBUG
        console.log(`${connectionId}: Loader#${transferId}: Finish (complete or error) / in ${new Date().getTime() - beginAt} [ms]`); // :DEBUG
        beginTransferAt.delete(transferId); // :DEBUG
        collection.delete(transferId);
      }
    }
    next();
  };

  const transfer = async (transferId: string, imageNo: number) => {
    console.log(`${connectionId}: Loader#${transferId}: Transfer ${imageNo}`);

    // @see createVolumeProvider.ts
    const data = transferImageMessageData(transferId, imageNo);
    const buffer = createDummyBuffer();

    try {
      await accept(data, buffer);
    } catch (err) {
      console.error((err as Error).message);
      stopTransfer(transferId);
    }
  };

  const beginTransfer = async (
    transferId: string,
    seriesUid: string,
    partialVolumeDescriptor?: PartialVolumeDescriptor,
    skip: MultiRangeDescriptor = []
  ) => {

    stopTransfer(transferId);

    // @TODO: check if the specified seriesUid is valid
    if (seriesUid !== dummyVolume.seriesUid) return;

    const queue = new PriorityIntegerQueue;
    const targets = new MultiRange([[0, dummyVolume.metadata.voxelCount[2] - 1]]).subtract(skip);
    queue.append(targets);

    collection.set(transferId, queue);

    beginTransferAt.set(transferId, new Date().getTime());

    if (!inOperation) next();
  };

  const setPriority = (transferId: string, target: MultiRangeDescriptor, priority: number) => {
    const priorityIntegerQueue = collection.get(transferId);
    if (priorityIntegerQueue) {
      const targetRange = new MultiRange(target).intersect(
        priorityIntegerQueue.entireRange()
      );
      if (0 < targetRange.segmentLength()) {
        priorityIntegerQueue.append(targetRange, priority);
      }
    }
  };

  const stopTransfer = (transferId: string) => {
    if (collection.has(transferId)) {
      collection.delete(transferId);
    }
  };

  const dispose = () => {
    collection.clear();
  };

  return { beginTransfer, setPriority, stopTransfer, dispose };
}

export default createImageTransferAgent;
