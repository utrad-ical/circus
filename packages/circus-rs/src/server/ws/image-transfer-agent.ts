import { PartialVolumeDescriptor, partialVolumeDescriptorToArray } from '@utrad-ical/circus-lib';
import PriorityIntegerQueue from '../../common/PriorityIntegerQueue';
import { MultiRange, Initializer as MultiRangeInitializer } from 'multi-integer-range';
import { TransferImageMessage, transferImageMessageData } from '../../common/ws/message';
import { VolumeAccessor, VolumeProvider } from '../helper/createVolumeProvider';

const PARTIAL_VOLUME_PRIORITY = 1;

interface ImageTransferAgent {
  beginTransfer: (transferId: string, seriesUid: string, partialVolumeDescriptor?: PartialVolumeDescriptor) => Promise<TransferConnection>;
  getConnection: (transferId: string) => Promise<TransferConnection | null>;
  dispose: () => void;
}

type TransferConnection = {
  id: () => string;
  time: () => number;
  transferNextImage: () => Promise<void>;
  setPriority: (target: MultiRangeInitializer, priority: number) => void;
  abort: () => void;
  pause: () => void;
  resume: () => void;
};

interface CreateImageTransferAgentOptions {
  imageDataEmitter: ImageDataEmitter;
  volumeProvider: VolumeProvider;
}

interface ImageDataEmitter {
  (data: TransferImageMessage, buffer: ArrayBuffer): Promise<void>;
}

const createImageTransferAgent = ({
  imageDataEmitter,
  volumeProvider
}: CreateImageTransferAgentOptions): ImageTransferAgent => {

  const transferConnections = new Map<string, TransferConnection>();
  const pendingsUntilTransferStarts = new Map<string, Promise<TransferConnection | null>>();

  let inOperation = false;
  const startOperationIfNecessary = () => {
    if (inOperation) return;
    inOperation = true;
    setImmediate(next);
  };
  const stopOperation = () => {
    if (!inOperation) return;
    inOperation = false;
  };

  const next = async () => {

    if (transferConnections.size === 0) return stopOperation();

    const transferIds = Array.from(transferConnections.keys());
    while (0 < transferIds.length) {
      const transferId = transferIds.shift()!;
      const connection = transferConnections.get(transferId);
      if (!connection) {
        // console.log(`No handler for tr#${transferId} con#${connectionId}`);
        continue;
      }

      // await new Promise<void>((resolve) => setTimeout(() => resolve(), 300));

      try {
        await connection.transferNextImage();
      } catch (err) {
        console.error(err);
      }
    }
    setImmediate(next);
  };

  const beginTransfer = async (
    transferId: string,
    seriesUid: string,
    partialVolumeDescriptor?: PartialVolumeDescriptor
  ) => {

    if (pendingsUntilTransferStarts.has(transferId) || transferConnections.has(transferId)) {
      throw new Error(`The transfer ${transferId} is already in progress.`)
    }

    // Mark as in preparation.
    let resolvePending: (con: TransferConnection | null) => void = () => { };
    pendingsUntilTransferStarts.set(transferId, new Promise<TransferConnection | null>((resolve) => resolvePending = resolve));

    // Supprot abort
    const abortSignal = new AbortController;
    abortSignal.signal.addEventListener('abort', () => {
      if (pendingsUntilTransferStarts.has(transferId)) {
        resolvePending(null);
      }
      if (transferConnections.has(transferId)) {
        transferConnections.delete(transferId);
        queue.clear();

        // @todo: Currently, there is no way to interrupt the volumeProvider loading process.
      }
    });
    const abort = abortSignal.abort.bind(abortSignal);

    const startTime = new Date().getTime();
    const { queue, fillImageToVolume } = prepare(await volumeProvider(seriesUid), partialVolumeDescriptor);

    const setPriority = async (target: MultiRangeInitializer, priority: number) => {
      const targetRange = new MultiRange(target).intersect(queue.toArray());
      if (0 < targetRange.segmentLength()) {
        // console.log(`Set priority ${priority} / ${targetRange.toString()}`);
        queue.append(targetRange, priority);
      }
    };

    const transferNextImage = async () => {
      if (paused) return;
      const imageIndex = queue.shift();
      if (imageIndex !== undefined) {
        try {
          const data = transferImageMessageData(transferId, imageIndex);
          const buffer = await fillImageToVolume(imageIndex);
          await imageDataEmitter(data, buffer);
        } catch (err) {
          abort();
          throw new Error(`Failed to emit image#${imageIndex} for tr#${transferId}: ${(err as Error).message}`);
        }
      } else {
        abort();
      }
    };

    let paused = false;
    const pause = () => paused = true;
    const resume = () => paused = false;

    const transferConnection: TransferConnection = {
      id: () => transferId,
      time: () => new Date().getTime() - startTime,
      transferNextImage,
      setPriority,
      abort,
      pause,
      resume
    };

    transferConnections.set(transferId, transferConnection);

    // Remove preparation mark.
    resolvePending(transferConnection);
    pendingsUntilTransferStarts.delete(transferId);

    startOperationIfNecessary();

    return transferConnection;
  };

  const getConnection = async (transferId: string): Promise<TransferConnection | null> => {
    if (transferConnections.has(transferId)) {
      return transferConnections.get(transferId)!;
    }
    if (pendingsUntilTransferStarts.has(transferId)) {
      return await pendingsUntilTransferStarts.get(transferId)!;
    }
    return null;
  };

  const dispose = () => {
    Array.from(transferConnections.values()).map(
      (connection) => connection.abort()
    );
    transferConnections.clear();
  };

  return { beginTransfer, getConnection, dispose };
}

const prepare = ({ volume, load, images }: VolumeAccessor, partialVolumeDescriptor?: PartialVolumeDescriptor) => {

  // Maps a zero-based volume z-index to the corresponding image number,
  // The number is the number to be specified when call load() function.
  const zIndices = new Map<number, number>();

  if (partialVolumeDescriptor) {
    // Set zIndices for the partial volume.
    const partialImages = partialVolumeDescriptorToArray(partialVolumeDescriptor);
    partialImages.forEach((v, i) => zIndices.set(i, v));
    // It has already started loading by volumeProvider.
    // So set higher priority to the images in partial volume.
    load(partialImages, PARTIAL_VOLUME_PRIORITY);
  } else {
    // Set zIndices for the entire volume.
    // It has already started loading by volumeProvider.
    images.toArray().forEach((v, i) => zIndices.set(i, v));
  }

  const imageIndices = Array.from(zIndices.keys());

  const queue = new PriorityIntegerQueue;
  queue.append(imageIndices);

  const fillImageToVolume = async (zIndex: number) => {
    const imageNo = zIndices.get(zIndex);
    // console.log(`zIndex: ${zIndex} => #${imageNo}`);
    if (!imageNo) throw new Error('Invalid image request');
    await load(imageNo);
    return volume.getSingleImage(imageNo - 1);
  };

  return { queue, fillImageToVolume };
}

export default createImageTransferAgent;
