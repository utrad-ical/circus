import * as rs from '@utrad-ical/circus-rs/src/browser';
import React, { useContext, useEffect, useState } from 'react';
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

  const [runningLoaders, setRunningLoaders] = useState<Set<string>>(new Set());
  const [volumeLoaders, setVolumeLoaders] = useState<
    rs.DicomVolumeLoader[] | null
  >(null);

  useEffect(() => {
    const seriesKeys = series.map(o => serializeUtilizeOptions(o));

    setRunningLoaders(prevLoaders => {
      const newLoaders = new Set(prevLoaders);

      //release volumeLoaders that is no longer in use
      Array.from(newLoaders.values())
        .filter(id => !seriesKeys.some(key => key === id))
        .forEach(id => {
          releaseVolumeLoader(id);
          newLoaders.delete(id);
        });

      //obtain unacquired volumeLoaders
      setVolumeLoaders(
        seriesKeys.map((key, ind) => {
          if (!newLoaders.has(key)) {
            acquireVolumeLoader(series[ind]);
            newLoaders.add(key);
          }
          return getVolumeLoader(key);
        })
      );
      return newLoaders;
    });

    return () => {
      setRunningLoaders(prevLoaders => {
        const newLoaders = new Set(prevLoaders);
        newLoaders.forEach(id => {
          releaseVolumeLoader(id);
          newLoaders.delete(id);
        });
        return newLoaders;
      });
    };
  }, [series]);

  const seriesKeys = series.map(o => serializeUtilizeOptions(o));

  if (seriesKeys.some(key => !runningLoaders.has(key))) return null;

  return volumeLoaders;
};
