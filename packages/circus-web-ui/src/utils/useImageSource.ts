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

  if (!isValidPartialVolumeDescriptor(partialVolumeDescriptor))
    throw new Error('Invalid partial volume descriptor');

  const key =
    seriesUid + '&' + stringifyPartialVolumeDescriptor(partialVolumeDescriptor);

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
 * Returns a HybridImageSource that is guaranteed to be "ready".
 * (This "ready" means the metadata has been loaded)
 */
export const useHybridImageSource = (
  seriesUid: string,
  partialVolumeDescriptor: PartialVolumeDescriptor
) => {
  const volumeLoader = usePendingVolumeLoader(
    seriesUid,
    partialVolumeDescriptor
  );
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
