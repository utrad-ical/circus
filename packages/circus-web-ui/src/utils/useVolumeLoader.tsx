import React, { useContext, useEffect, useMemo, useRef } from 'react';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import PartialVolumeDescriptor from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import { serializeUtilizeOptions, VolumeLoaderManager } from './createVolumeLoaderManager';

export interface SeriesEntryWithHints {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
  estimateWindowType?: rs.EstimateWindowType;
}

export const VolumeLoaderFactoryContext = React.createContext<VolumeLoaderManager>(null as any);

export const useVolumeLoaders = (series: SeriesEntryWithHints[]) => {
  const { acquireVolumeLoader, releaseVolumeLoader, getVolumeLoader } = useContext(VolumeLoaderFactoryContext)!;

  const runningLoaders = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      runningLoaders.current.forEach(id => {
        releaseVolumeLoader(id);
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
    },
    [acquireVolumeLoader, getVolumeLoader, releaseVolumeLoader, series]
  );
};
