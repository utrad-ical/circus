import PartialVolumeDescriptor, {
  isValidPartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import * as rs from '@utrad-ical/circus-rs/src/browser';

export interface SeriesEntryWithHints {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
  estimateWindowType?: rs.EstimateWindowType;
}

export interface VolumeLoaderManager {
  /**
   * Creates volume loader when necessary and increases internal reference counter.
   */
  acquireVolumeLoader: (options: SeriesEntryWithHints) => string; // id , 使用中カウンタを増やす

  /**
   * Gets acquired loader
   */
  getVolumeLoader: (id: string) => rs.DicomVolumeLoader;

  /**
   * Decreases internal reference counter and disposes after cacheTime [ms] if no longer necessary.
   */
  releaseVolumeLoader: (id: string) => void;

  /**
   * Disconnect websocket connection.
   */
  disconnect: () => void;
}

export const createVolumeLoaderManager = ({
  server,
  queryString = '',
  cacheTimeout = 60000
}: {
  server: string;
  queryString?: string;
  cacheTimeout?: number;
}): VolumeLoaderManager => {
  const secure = server.match(/^https/);
  const host = server.replace(/^.*\/\/(.*)$/, '$1');

  const rsHttpClient = new rs.RsHttpClient(
    `${secure ? 'https' : 'http'}://${host}`
  );
  const wsClient = new rs.WebSocketClient(
    `${secure ? 'wss' : 'ws'}://${host}/ws/volume${queryString ? '?' + queryString : ''}`
  );
  const transferConnectionFactory =
    rs.createTransferConnectionFactory(wsClient);

  const loaders = new Map<string, rs.DicomVolumeLoader>();
  const referenceCounter = new Map<string, number>();
  const cleanupTimeout = new Map<string, NodeJS.Timeout>();

  const acquireVolumeLoader = (options: SeriesEntryWithHints) => {
    if (
      options.partialVolumeDescriptor &&
      !isValidPartialVolumeDescriptor(options.partialVolumeDescriptor)
    )
      throw new Error('Invalid partial volume descriptor');

    const id = serializeUtilizeOptions(options);

    if (!loaders.has(id)) {
      // console.log(`Create new loader #${id}`);
      const loader = new rs.RsProgressiveVolumeLoader({
        rsHttpClient,
        transferConnectionFactory,
        ...options
      });
      loaders.set(id, loader);
    } else if (referenceCounter.get(id) === 0) {
      loaders.get(id)?.loadController?.resume();
      // console.log(`Resume loader #${id}`);
    }

    referenceCounter.set(id, (referenceCounter.get(id) ?? 0) + 1);
    if (cleanupTimeout.has(id)) {
      clearTimeout(cleanupTimeout.get(id)!);
      cleanupTimeout.delete(id);
    }
    return id;
  };

  const getVolumeLoader = (id: string) => {
    if (!loaders.has(id))
      throw new Error('The loader for specified id is not utilized');
    return loaders.get(id)!;
  };

  const cleanup = (id: string) => {
    loaders.get(id)?.loadController?.pause();
    // console.log(`Pause loader #${id}`);

    const timeout = setTimeout(() => {
      const count = referenceCounter.get(id) || 0;
      if (count === 0) {
        // console.log(`Delete loader #${id}`);

        loaders.get(id)?.loadController?.abort();
        loaders.delete(id);
        referenceCounter.delete(id);
      }
    }, cacheTimeout);

    cleanupTimeout.set(id, timeout);
  };

  const releaseVolumeLoader = (id: string) => {
    const count = referenceCounter.get(id) || 0;
    if (count < 1) return;

    referenceCounter.set(id, count - 1);
    if (count === 1) cleanup(id);
  };

  const disconnect = () => wsClient?.disconnect();

  return {
    acquireVolumeLoader,
    getVolumeLoader,
    releaseVolumeLoader,
    disconnect
  };
};

export const serializeUtilizeOptions = ({
  seriesUid,
  partialVolumeDescriptor,
  estimateWindowType
}: SeriesEntryWithHints) =>
  seriesUid +
  (partialVolumeDescriptor
    ? `&${partialVolumeDescriptor.start}:${partialVolumeDescriptor.end}:${partialVolumeDescriptor.delta}`
    : '') +
  (estimateWindowType ? `/${estimateWindowType}` : '');
