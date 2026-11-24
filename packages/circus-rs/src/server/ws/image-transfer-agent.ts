import type PartialVolumeDescriptor from '../../volume/PartialVolumeDescriptor.ts';
import type { Logger } from '@utrad-ical/circus-lib';
import { partialVolumeDescriptorToArray } from '../../volume/PartialVolumeDescriptor.ts';
import PriorityIntegerQueue from '../../common/PriorityIntegerQueue.ts';
import * as mr from 'multi-integer-range';
import { type RangeInput, toRange } from '../../common/rangeInput.ts';
import type { TransferImageMessage } from '../../common/ws/message.ts';
import { transferImageMessageData } from '../../common/ws/message.ts';
import type {
  VolumeAccessor,
  VolumeProvider
} from '../helper/createVolumeProvider.ts';

const PARTIAL_VOLUME_PRIORITY = 1;

interface ImageTransferAgent {
  beginTransfer: (
    transferId: string,
    seriesUid: string,
    partialVolumeDescriptor?: PartialVolumeDescriptor
  ) => Promise<TransferConnection | null>;
  getConnection: (transferId: string) => Promise<TransferConnection | null>;
  dispose: () => void;
}

type TransferConnection = {
  id: () => string;
  time: () => number;
  transferNextImage: () => Promise<void>;
  setPriority: (target: RangeInput, priority: number) => void;
  abort: () => void;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
};

interface CreateImageTransferAgentOptions {
  imageDataEmitter: ImageDataEmitter;
  /** Tells the client that a transfer failed */
  errorEmitter: (transferId: string, message: string) => Promise<void>;
  volumeProvider: VolumeProvider;
  logger: Logger;
}

interface ImageDataEmitter {
  (data: TransferImageMessage, buffer: ArrayBuffer): Promise<void>;
}

const createImageTransferAgent = ({
  imageDataEmitter,
  errorEmitter,
  volumeProvider,
  logger
}: CreateImageTransferAgentOptions): ImageTransferAgent => {
  const transferConnections = new Map<string, TransferConnection>();

  const notifyError = async (transferId: string, err: unknown) => {
    // Do not show internal details such as file paths
    const message = (err as any)?.expose
      ? (err as Error).message
      : 'Failed to load the series.';
    try {
      await errorEmitter(transferId, message);
    } catch {
      // The connection may have been closed
    }
  };
  const pendingsUntilTransferStarts = new Map<
    string,
    Promise<TransferConnection | null>
  >();

  let disposed = false;
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
    // Stop while there is nothing to send; resume() starts it again
    const active = Array.from(transferConnections.values()).some(
      connection => !connection.isPaused()
    );
    if (!active) return stopOperation();

    const transferIds = Array.from(transferConnections.keys());
    while (0 < transferIds.length) {
      const transferId = transferIds.shift()!;
      const connection = transferConnections.get(transferId);
      if (!connection || connection.isPaused()) continue;

      // await new Promise<void>((resolve) => setTimeout(() => resolve(), 300));

      try {
        await connection.transferNextImage();
      } catch (err) {
        logger.error({ err }, 'RS WebSocket image transfer failed');
      }
    }
    setImmediate(next);
  };

  const beginTransfer = async (
    transferId: string,
    seriesUid: string,
    partialVolumeDescriptor?: PartialVolumeDescriptor
  ) => {
    if (
      pendingsUntilTransferStarts.has(transferId) ||
      transferConnections.has(transferId)
    ) {
      throw new Error(`The transfer ${transferId} is already in progress.`);
    }

    // Mark as in preparation.
    let resolvePending: (con: TransferConnection | null) => void = () => {};
    pendingsUntilTransferStarts.set(
      transferId,
      new Promise<TransferConnection | null>(
        resolve => (resolvePending = resolve)
      )
    );

    // Supprot abort
    const abortSignal = new AbortController();
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
    let accessor: VolumeAccessor;
    try {
      accessor = await volumeProvider(seriesUid);
    } catch (err) {
      resolvePending(null);
      pendingsUntilTransferStarts.delete(transferId);
      if (!disposed) await notifyError(transferId, err);
      throw err;
    }
    if (disposed) {
      // The WebSocket was closed while the series was being loaded
      resolvePending(null);
      pendingsUntilTransferStarts.delete(transferId);
      return null;
    }
    const { queue, fillImageToVolume, prioritize } = prepare(
      accessor,
      partialVolumeDescriptor
    );

    const setPriority = async (target: RangeInput, priority: number) => {
      const targetRange = mr.intersect(
        toRange(target),
        mr.normalize(queue.toArray())
      );
      if (0 < targetRange.length) {
        // console.log(`Set priority ${priority} / ${mr.stringify(targetRange)}`);
        queue.append(targetRange, priority);
        // Let the loader start all of them now, not one by one as they are sent
        prioritize(targetRange, priority);
      }
    };

    const transferNextImage = async () => {
      if (paused) return;
      const { value: imageIndex, priority } = queue.shift();
      if (imageIndex !== undefined) {
        let buffer: ArrayBuffer;
        try {
          buffer = await fillImageToVolume(imageIndex, priority);
        } catch (err) {
          abort();
          await notifyError(transferId, err);
          throw new Error(
            `Failed to load image#${imageIndex} for tr#${transferId}: ${
              (err as Error).message
            }`
          );
        }
        try {
          const data = transferImageMessageData(transferId, imageIndex);
          await imageDataEmitter(data, buffer);
        } catch (err) {
          abort();
          throw new Error(
            `Failed to emit image#${imageIndex} for tr#${transferId}: ${
              (err as Error).message
            }`
          );
        }
      } else {
        abort();
      }
    };

    let paused = false;
    const pause = () => (paused = true);
    const resume = () => {
      paused = false;
      if (transferConnections.has(transferId)) startOperationIfNecessary();
    };

    const transferConnection: TransferConnection = {
      id: () => transferId,
      time: () => new Date().getTime() - startTime,
      transferNextImage,
      setPriority,
      abort,
      pause,
      resume,
      isPaused: () => paused
    };

    transferConnections.set(transferId, transferConnection);

    // Remove preparation mark.
    resolvePending(transferConnection);
    pendingsUntilTransferStarts.delete(transferId);

    startOperationIfNecessary();

    return transferConnection;
  };

  const getConnection = async (
    transferId: string
  ): Promise<TransferConnection | null> => {
    if (transferConnections.has(transferId)) {
      return transferConnections.get(transferId)!;
    }
    if (pendingsUntilTransferStarts.has(transferId)) {
      return await pendingsUntilTransferStarts.get(transferId)!;
    }
    return null;
  };

  const dispose = () => {
    disposed = true;
    Array.from(transferConnections.values()).map(connection =>
      connection.abort()
    );
    transferConnections.clear();
  };

  return { beginTransfer, getConnection, dispose };
};

const prepare = (
  { volume, load, images }: VolumeAccessor,
  partialVolumeDescriptor?: PartialVolumeDescriptor
) => {
  // Maps a zero-based volume z-index to the corresponding image number,
  // The number is the number to be specified when call load() function.
  const zIndices = new Map<number, number>();
  const imageNoToZ = (imageNo: number) => mr.flatten(images).indexOf(imageNo);
  if (partialVolumeDescriptor) {
    // Set zIndices for the partial volume.
    const partialImages = partialVolumeDescriptorToArray(
      partialVolumeDescriptor
    );
    partialImages.forEach((v, i) => zIndices.set(i, v));
    // It has already started loading by volumeProvider.
    // So set higher priority to the images in partial volume.
    // A failure is reported when the image is transferred
    load(partialImages, PARTIAL_VOLUME_PRIORITY).catch(() => {});
  } else {
    // Set zIndices for the entire volume.
    // It has already started loading by volumeProvider.
    mr.flatten(images).forEach((v, i) => zIndices.set(i, v));
  }

  const imageIndices = Array.from(zIndices.keys());

  const queue = new PriorityIntegerQueue({ lifoForSamePriority: true });
  queue.append(imageIndices);

  const fillImageToVolume = async (zIndex: number, priority?: number) => {
    const imageNo = zIndices.get(zIndex);
    // console.log(`zIndex: ${zIndex} => #${imageNo}`);
    if (!imageNo) throw new Error('Invalid image request');
    const z = imageNoToZ(imageNo);
    if (z === -1) throw new Error('Invalid image request');
    await load(imageNo, priority ?? 0);
    return volume.getSingleImage(z);
  };

  const prioritize = (zRange: mr.MIR, priority: number) => {
    const imageNos = mr
      .flatten(zRange)
      .map(z => zIndices.get(z))
      .filter((no): no is number => no !== undefined);
    // A failure is reported when the image is transferred
    if (imageNos.length) load(imageNos, priority).catch(() => {});
  };

  return { queue, fillImageToVolume, prioritize };
};

export default createImageTransferAgent;
