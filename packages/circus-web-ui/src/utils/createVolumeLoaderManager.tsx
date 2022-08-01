import * as rs from '@utrad-ical/circus-rs/src/browser';
import PartialVolumeDescriptor, {
  isValidPartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';

export interface SeriesEntryWithHints {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
  estimateWindowType?: rs.EstimateWindowType;
}

export interface VolumeLoaderManager {
  serializeUtilizeOptions: ({ seriesUid, partialVolumeDescriptor, estimateWindowType }: SeriesEntryWithHints) => string;
  utilizeVolumeLoader: (options: SeriesEntryWithHints) => string; // id
  getVolumeLoader: (id: string) => rs.DicomVolumeProgressiveLoader;
  abandonVolumeLoader: (id: string) => void;
}

export const nullVolumeLoaderManager: VolumeLoaderManager = {
  serializeUtilizeOptions: () => { throw new Error('Context is not ready') },
  utilizeVolumeLoader: () => { throw new Error('Context is not ready') },
  getVolumeLoader: () => { throw new Error('Context is not ready') },
  abandonVolumeLoader: () => { throw new Error('Context is not ready') },
};

const createVolumeLoaderManager = ({
  server,
  cacheTimeout = 5000
}: {
  server: string;
  cacheTimeout?: number
}): VolumeLoaderManager => {
  const secure = server.match(/^https/);
  const host = server.replace(/^.*\/\/(.*)$/, '$1');

  const rsHttpClient = new rs.RsHttpClient(`${secure ? 'https' : 'http'}://${host}`);
  const wsClient = new rs.WebSocketClient(`${secure ? 'wss' : 'ws'}://${host}/ws/volume`);
  const transferConnectionFactory = rs.createTransferConnectionFactory(wsClient);

  const loaders = new Map<string, rs.DicomVolumeProgressiveLoader>();
  const referenceCounter = new Map<string, number>();
  const cleanupTimeout = new Map<string, NodeJS.Timeout>();

  const serializeUtilizeOptions = ({ seriesUid, partialVolumeDescriptor, estimateWindowType }: SeriesEntryWithHints) =>
    seriesUid +
    (partialVolumeDescriptor ? `&${partialVolumeDescriptor.start}:${partialVolumeDescriptor.end}:${partialVolumeDescriptor.delta}` : '') +
    (estimateWindowType ? `/${estimateWindowType}` : '');

  const utilizeVolumeLoader = (options: SeriesEntryWithHints) => {

    if (options.partialVolumeDescriptor && !isValidPartialVolumeDescriptor(options.partialVolumeDescriptor))
      throw new Error('Invalid partial volume descriptor');

    const id = serializeUtilizeOptions(options);

    if (!loaders.has(id)) {
      console.log(`Create new loader #${id}`);
      const loader = new rs.RsProgressiveVolumeLoader({
        rsHttpClient,
        transferConnectionFactory,
        ...options
      });
      loaders.set(id, loader);
    }

    referenceCounter.set(id, (referenceCounter.get(id) ?? 0) + 1);
    if (cleanupTimeout.has(id)) {
      clearTimeout(cleanupTimeout.get(id)!);
      cleanupTimeout.delete(id);
    }
    return id;

  };

  const getVolumeLoader = (id: string) => {
    if (!loaders.has(id)) throw new Error('The loader for specified id is not utilized');
    return loaders.get(id)!;
  };

  const cleanup = (id: string) => {
    const timeout = setTimeout(() => {
      const count = referenceCounter.get(id) || 0;
      if (count === 0) {
        console.log(`Delete loader #${id}`);

        loaders.get(id)?.abort();
        loaders.delete(id);
        referenceCounter.delete(id);
      }
    }, cacheTimeout);

    cleanupTimeout.set(id, timeout);
  };

  const abandonVolumeLoader = (id: string) => {
    const count = referenceCounter.get(id) || 0;
    if (count < 1) return;

    referenceCounter.set(id, count - 1);
    if (count === 1) cleanup(id);
  };

  return { serializeUtilizeOptions, utilizeVolumeLoader, getVolumeLoader, abandonVolumeLoader };
}

export default createVolumeLoaderManager;
