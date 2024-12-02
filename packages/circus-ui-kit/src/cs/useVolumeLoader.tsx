import React, { useContext, useEffect, useMemo, useRef } from 'react';
import {
  serializeUtilizeOptions,
  SeriesEntryWithHints,
  VolumeLoaderManager
} from './createVolumeLoaderManager';

export const VolumeLoaderFactoryContext =
  React.createContext<VolumeLoaderManager>(null as any);

export const useVolumeLoaders = (series: SeriesEntryWithHints[]) => {
  const { acquireVolumeLoader, releaseVolumeLoader, getVolumeLoader } =
    useContext(VolumeLoaderFactoryContext)!;

  const runningLoaders = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentLoaders = runningLoaders.current;
    return () => {
      currentLoaders.forEach(id => {
        releaseVolumeLoader(id);
        currentLoaders.delete(id);
      });
    };
  }, [releaseVolumeLoader]);

  return useMemo(() => {
    const seriesKeys = series.map(o => serializeUtilizeOptions(o));

    Array.from(runningLoaders.current.values())
      .filter(id => !seriesKeys.some(key => key === id))
      .forEach(id => {
        releaseVolumeLoader(id);
        runningLoaders.current.delete(id);
      });

    return series.map((options: SeriesEntryWithHints) => {
      const key = serializeUtilizeOptions(options);
      if (!runningLoaders.current.has(key)) {
        acquireVolumeLoader(options);
        runningLoaders.current.add(key);
      }
      return getVolumeLoader(key);
    });
  }, [acquireVolumeLoader, getVolumeLoader, releaseVolumeLoader, series]);
};
