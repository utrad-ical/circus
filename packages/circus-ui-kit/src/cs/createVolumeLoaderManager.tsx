import type { PartialVolumeDescriptor } from '@utrad-ical/circus-rs';
import { isValidPartialVolumeDescriptor } from '@utrad-ical/circus-rs';
import * as rs from '@utrad-ical/circus-rs';

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
  // `server` may be an absolute URL or a path on the current origin (`/rs`).
  // On the same origin, the browser sends the session cookie of CIRCUS
  // with both the HTTP and WebSocket requests.
  const url = new URL(server, window.location.href);
  const base = (url.origin + url.pathname).replace(/\/$/, '');
  const wsBase = base.replace(/^http/, 'ws');

  const rsHttpClient = new rs.RsHttpClient(base);
  const wsClient = new rs.WebSocketClient(
    `${wsBase}/ws/volume${queryString ? '?' + queryString : ''}`
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
