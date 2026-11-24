import type * as rs from '@utrad-ical/circus-rs';
import React, { useContext, useEffect, useState } from 'react';
import type {
  SeriesEntryWithHints,
  VolumeLoaderManager
} from './createVolumeLoaderManager.tsx';
import { serializeUtilizeOptions } from './createVolumeLoaderManager.tsx';

export const VolumeLoaderFactoryContext =
  React.createContext<VolumeLoaderManager>(null as any);

/**
 * Acquires the volume loaders for the given series while mounted.
 * Returns null until they are ready.
 */
export const useVolumeLoaders = (series: SeriesEntryWithHints[]) => {
  const manager = useContext(VolumeLoaderFactoryContext)!;

  // Callers may pass a new array on every render, so depend on its content
  const key = JSON.stringify(series.map(s => serializeUtilizeOptions(s)));

  const [acquired, setAcquired] = useState<{
    key: string;
    loaders: rs.DicomVolumeLoader[];
  } | null>(null);

  useEffect(() => {
    const ids = series.map(s => manager.acquireVolumeLoader(s));
    setAcquired({ key, loaders: ids.map(id => manager.getVolumeLoader(id)) });
    return () => {
      // Release after the next effect acquires, so that loaders still in use
      // are not paused and resumed
      queueMicrotask(() => ids.forEach(id => manager.releaseVolumeLoader(id)));
    };
  }, [manager, key]);

  return acquired?.key === key ? acquired.loaders : null;
};
