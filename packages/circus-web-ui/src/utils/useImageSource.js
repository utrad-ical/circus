import React, { useContext, useState, useEffect, useMemo } from 'react';
import useLoginUser from './useLoginUser';
import * as rs from 'circus-rs';
import { isValidPartialVolumeDescriptor } from '@utrad-ical/circus-lib/lib/PartialVolumeDescriptor';

/**
 * @type React.Context<Map<string, rs.ImageSource>
 */
export const ImageSourceCacheContext = React.createContext(null);

const stringifyPartialVolumeDescriptor = d => `${d.start}:${d.end}:${d.delta}`;

/**
 * Returns a cached HybridImageSource instance for the specified series.
 * The returned source may not be "ready" yet.
 */
export const usePendingImageSource = (seriesUid, partialVolumeDescriptor) => {
  const user = useLoginUser();
  const server = user.dicomImageServer;

  const map = useContext(ImageSourceCacheContext);
  const rsHttpClient = useMemo(() => new rs.RsHttpClient(server), [server]);

  const key =
    seriesUid +
    (typeof partialVolumeDescriptor === 'object' &&
    isValidPartialVolumeDescriptor(partialVolumeDescriptor)
      ? '&' + stringifyPartialVolumeDescriptor(partialVolumeDescriptor)
      : '');

  if (map.has(key)) return map.get(key);

  const volumeLoader = new rs.RsVolumeLoader({
    rsHttpClient,
    seriesUid,
    partialVolumeDescriptor
  });
  const imageSource = new rs.HybridMprImageSource({
    rsHttpClient,
    seriesUid,
    volumeLoader
  });

  map.set(key, imageSource);
  return imageSource;
};

/**
 * Returns a cached HybridImageSource instance for the specified series.
 * This is used to recycle ImageSource's among multiple viewers.
 * The hook returns null if the specified image source is not yet "ready".
 * When it returns an actula instance, it is guaranteed to be "ready".
 */
export const useImageSource = (seriesUid, partialVolumeDescriptor) => {
  const [imageSource, setImageSource] = useState();
  const pendingImageSource = usePendingImageSource(
    seriesUid,
    partialVolumeDescriptor
  );
  useEffect(
    () => {
      pendingImageSource.ready().then(() => setImageSource(pendingImageSource));
      return () => setImageSource(null);
    },
    [pendingImageSource]
  );
  return imageSource;
};

export default useImageSource;
