import React, { useContext, useState, useEffect, useMemo } from 'react';
import * as rs from 'circus-rs';
import * as pvd from '@utrad-ical/circus-lib/lib/PartialVolumeDescriptor';

/**
 * @type React.Context<{
 *    rsHttpClient: rs.RsHttpClient; map: Map<string, rs.RsVolumeLoader>>;
 * }>
 */
export const VolumeLoaderCacheContext = React.createContext(null);

const stringifyPartialVolumeDescriptor = d => `${d.start}:${d.end}:${d.delta}`;

/**
 * Returns a cached RsVolumeLoader instance for the specified series.
 * The returned source may not be "ready" yet.
 * @param {string} seriesUid
 * @param {pvd.default} partialVolumeDescriptor
 */
export const usePendingVolumeLoader = (seriesUid, partialVolumeDescriptor) => {
  const { rsHttpClient, map } = useContext(VolumeLoaderCacheContext);

  const key =
    seriesUid +
    (typeof partialVolumeDescriptor === 'object' &&
    pvd.isValidPartialVolumeDescriptor(partialVolumeDescriptor)
      ? '&' + stringifyPartialVolumeDescriptor(partialVolumeDescriptor)
      : '');

  if (map.has(key)) return map.get(key);

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
 * @param {string} seriesUid
 * @param {pvd.default} partialVolumeDescriptor
 */
export const useVolumeLoader = (seriesUid, partialVolumeDescriptor) => {
  const [volumeLoader, setVolumeLoader] = useState();
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
    return () => setVolumeLoader(null);
  }, [pendingVolumeLoader]);
  return volumeLoader;
};

/**
 * Returns a HybridImageSource that is guaranteed to be "ready".
 */
export const useHybridImageSource = (seriesUid, partialVolumeDescriptor) => {
  const volumeLoader = useVolumeLoader(seriesUid, partialVolumeDescriptor);
  const { rsHttpClient } = useContext(VolumeLoaderCacheContext);
  const [imageSource, setImageSource] = useState();
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
