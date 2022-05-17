import { PartialVolumeDescriptor, partialVolumeDescriptorToArray } from '@utrad-ical/circus-lib';
import PriorityIntegerQueue from '../../common/PriorityIntegerQueue';
import { MultiRange } from 'multi-integer-range';
import { MultiRangeDescriptor } from '../../common/ws/types';
import { TransferImageMessage, transferImageMessageData } from '../../common/ws/message';
import { debugDummyWait, createDummyBuffer, dummyVolume } from '../../ws-temporary-config';
import { DicomFileRepository } from '@utrad-ical/circus-lib';
import { DicomExtractorWorker } from '../helper/extractor-worker/createDicomExtractorWorker';

export type ImageTransferAgent = ReturnType<typeof createImageTransferAgent>;

interface Acceptor {
  (data: TransferImageMessage, buffer: ArrayBuffer): Promise<void>;
}

type LoadingItem = {
  fetch: (image: number) => Promise<ArrayBuffer>;
  queue: PriorityIntegerQueue;
  startTime: number; // :DEBUG
}

const createImageTransferAgent = (
  accept: Acceptor,
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
      const { queue, fetch, startTime } = collection.get(transferId)!;
      const imageNo = queue.shift();
      if (imageNo !== undefined) {
        if (debugDummyWait) await (debugDummyWait as unknown as () => Promise<void>)(); // :DEBUG
        const buffer = createDummyBuffer ? (createDummyBuffer as any)() : await fetch(imageNo);

        console.log(`${connectionId}: Loader#${transferId}: Transfer ${imageNo}`);
        const data = transferImageMessageData(transferId, imageNo);

        try {
          await accept(data, buffer);
        } catch (err) {
          console.error((err as Error).message);
          stopTransfer(transferId);
        }

      } else {
        console.log(`${connectionId}: Loader#${transferId}: Finish (complete or error) / in ${new Date().getTime() - startTime} [ms]`); // :DEBUG
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
    }
  };

  const dispose = () => {
    collection.clear();
  };

  return { beginTransfer, setPriority, stopTransfer, dispose };
}

export default createImageTransferAgent;
