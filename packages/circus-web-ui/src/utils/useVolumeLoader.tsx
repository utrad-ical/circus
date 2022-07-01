import React, { useContext, useEffect, useMemo, useRef } from 'react';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import PartialVolumeDescriptor, {
  isValidPartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import { useSelector } from 'react-redux';
import { EstimateWindowType } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/rs-loader-utils';

type Context = {
  serializeUtilizeOptions: (options: UtilizeOptions) => string;
  utilizeVolumeLoader: (options: UtilizeOptions) => string;
  getVolumeLoader: (key: string) => rs.DicomVolumeProgressiveLoader;
  abandonVolumeLoader: (key: string) => void;
};

interface UtilizeOptions {
  seriesUid: string;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
  estimateWindowType?: EstimateWindowType;
}

const defaultContextValue = {
  serializeUtilizeOptions: () => { throw new Error('Context is not ready') },
  utilizeVolumeLoader: () => { throw new Error('Context is not ready') },
  getVolumeLoader: () => { throw new Error('Context is not ready') },
  abandonVolumeLoader: () => { throw new Error('Context is not ready') },
};

const VolumeLoaderFactoryContext = React.createContext<Context>(defaultContextValue);

export const VolumeLoaderFactoryProvider: React.FC<{ cacheTimeout?: number }> = ({ children, cacheTimeout = 5000 }) => {
  const server = useSelector(state => state.loginUser.data?.dicomImageServer);

  const loaders = useRef(new Map<string, rs.DicomVolumeProgressiveLoader>());
  const referenceCounter = useRef(new Map<string, number>());
  const cleanupTimeout = useRef(new Map<string, NodeJS.Timeout>());

  const contextValue = useMemo(() => {
    if (!server) return defaultContextValue;

    const secure = server.match(/^https/);
    const host = server.replace(/^.*\/\/(.*)$/, '$1');

    const rsHttpClient = new rs.RsHttpClient(`${secure ? 'https' : 'http'}://${host}`);
    const wsClient = new rs.WebSocketClient(`${secure ? 'wss' : 'ws'}://${host}/ws/volume`);
    const transferConnectionFactory = rs.createTransferConnectionFactory(wsClient);

    const serializeUtilizeOptions = ({ seriesUid, partialVolumeDescriptor, estimateWindowType }: UtilizeOptions) =>
      seriesUid +
      (partialVolumeDescriptor ? `&${partialVolumeDescriptor.start}:${partialVolumeDescriptor.end}:${partialVolumeDescriptor.delta}` : '') +
      (estimateWindowType ? `/${estimateWindowType}` : '');

    const utilizeVolumeLoader = (options: UtilizeOptions) => {

      if (options.partialVolumeDescriptor && !isValidPartialVolumeDescriptor(options.partialVolumeDescriptor))
        throw new Error('Invalid partial volume descriptor');

      const id = serializeUtilizeOptions(options);

      if (!loaders.current.has(id)) {
        console.log(`Create new loader #${id}`);
        const loader = new rs.RsProgressiveVolumeLoader({
          rsHttpClient,
          transferConnectionFactory,
          ...options
        });
        loaders.current.set(id, loader);
      }

      referenceCounter.current.set(id, (referenceCounter.current.get(id) ?? 0) + 1);
      if (cleanupTimeout.current.has(id)) {
        clearTimeout(cleanupTimeout.current.get(id)!);
        cleanupTimeout.current.delete(id);
      }
      return id;
    };

    const getVolumeLoader = (id: string) => {
      if (!loaders.current.has(id)) throw new Error('The loader for specified id is not utilized');
      return loaders.current.get(id)!;
    };

    const cleanup = (id: string) => {
      const timeout = setTimeout(() => {
        const count = referenceCounter.current.get(id) || 0;
        if (count === 0) {
          console.log(`Delete loader #${id}`);

          loaders.current.get(id)?.abort();
          loaders.current.delete(id);
          referenceCounter.current.delete(id);
        }
      }, cacheTimeout);

      cleanupTimeout.current.set(id, timeout);
    };

    const abandonVolumeLoader = (id: string) => {
      const count = referenceCounter.current.get(id) || 0;
      if (count < 1) return;

      referenceCounter.current.set(id, count - 1);
      if (count === 1) cleanup(id);
    };

    return { serializeUtilizeOptions, utilizeVolumeLoader, getVolumeLoader, abandonVolumeLoader };
  }, [server]);

  return (
    <VolumeLoaderFactoryContext.Provider value={contextValue}>
      {children}
    </VolumeLoaderFactoryContext.Provider>
  );
};


export const useVolumeLoaders = (series: UtilizeOptions[]) => {
  const { serializeUtilizeOptions, utilizeVolumeLoader, abandonVolumeLoader, getVolumeLoader } = useContext(VolumeLoaderFactoryContext)!;

  const runningLoaders = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      runningLoaders.current.forEach(id => {
        abandonVolumeLoader(id);
        runningLoaders.current.delete(id);
      });
    }
  }, []);

  return useMemo(
    () => {
      const seriesKeys = series.map(o => serializeUtilizeOptions(o));

      Array.from(runningLoaders.current.values())
        .filter(id => !seriesKeys.some(key => key === id))
        .forEach(id => {
          abandonVolumeLoader(id);
          runningLoaders.current.delete(id);
        });

      return series.map((options: UtilizeOptions) => {
        const key = serializeUtilizeOptions(options);
        if (!runningLoaders.current.has(key)) {
          utilizeVolumeLoader(options);
          runningLoaders.current.add(key);
        }
        return getVolumeLoader(key);
      });
    },
    [serializeUtilizeOptions, utilizeVolumeLoader, getVolumeLoader, abandonVolumeLoader, series]
  );
};
