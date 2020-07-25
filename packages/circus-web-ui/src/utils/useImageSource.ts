import React, { useContext, useState, useEffect, useMemo } from 'react';
import * as rs from 'circus-rs';
import PartialVolumeDescriptor, {
  isValidPartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';

export const VolumeLoaderCacheContext = React.createContext<{
  rsHttpClient: rs.RsHttpClient;
  map: Map<string, rs.RsVolumeLoader>;
} | null>(null);

const stringifyPartialVolumeDescriptor = (d: PartialVolumeDescriptor) =>
  `${d.start}:${d.end}:${d.delta}`;

/**
 * Returns a cached RsVolumeLoader instance for the specified series.
 * The returned source may not be "ready" yet.
 */
export const usePendingVolumeLoader = (
  seriesUid: string,
  partialVolumeDescriptor: PartialVolumeDescriptor
) => {
  const { rsHttpClient, map } = useContext(VolumeLoaderCacheContext)!;

  const key =
    seriesUid +
    (typeof partialVolumeDescriptor === 'object' &&
    isValidPartialVolumeDescriptor(partialVolumeDescriptor)
      ? '&' + stringifyPartialVolumeDescriptor(partialVolumeDescriptor)
      : '');

  if (map.has(key)) return map.get(key)!;

  const volumeLoader = new rs.RsVolumeLoader({
    rsHttpClient,
    seriesUid,
    partialVolumeDescriptor
  });
  map.set(key, volumeLoader);
  return volumeLoader;
};

/**
 * Returns a cached VolumeLoader instance for the specified series.
 * This is used to recycle volumes among multiple viewers.
 * The hook returns null if the specified volume is not yet "ready".
 * When this returns an actual instance, it is guaranteed to be "ready".
 */
export const useVolumeLoader = (
  seriesUid: string,
  partialVolumeDescriptor: PartialVolumeDescriptor
) => {
  const [volumeLoader, setVolumeLoader] = useState<rs.RsVolumeLoader>();
  const pendingVolumeLoader = usePendingVolumeLoader(
    seriesUid,
    partialVolumeDescriptor
  );
  useEffect(() => {
    const load = async () => {
      await pendingVolumeLoader.loadMeta();
      await pendingVolumeLoader.loadVolume();
      setVolumeLoader(pendingVolumeLoader);
    };
    load();
    return () => setVolumeLoader(undefined);
  }, [pendingVolumeLoader]);
  return volumeLoader;
};

/**
 * Returns a HybridImageSource that is guaranteed to be "ready".
 */
export const useHybridImageSource = (
  seriesUid: string,
  partialVolumeDescriptor: PartialVolumeDescriptor
) => {
  const volumeLoader = useVolumeLoader(seriesUid, partialVolumeDescriptor);
  const { rsHttpClient } = useContext(VolumeLoaderCacheContext)!;
  const [imageSource, setImageSource] = useState<rs.HybridMprImageSource>();
  const pendindImageSource = useMemo(() => {
    if (!volumeLoader) return null;
    return new rs.HybridMprImageSource({
      rsHttpClient,
      seriesUid,
      volumeLoader
    });
  }, [seriesUid, rsHttpClient, volumeLoader]);

  useEffect(() => {
    const load = async () => {
      if (!pendindImageSource) return;
      await pendindImageSource.ready();
      setImageSource(pendindImageSource);
    };
    load();
  }, [pendindImageSource]);

  return imageSource;
};

export default useVolumeLoader;
