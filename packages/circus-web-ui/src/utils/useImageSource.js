import React, { useContext, useMemo } from 'react';
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
 * This is used to recycle ImageSource's among multiple viewers.
 * The returned source may not be "ready" yet.
 */
const useImageSource = (seriesUid, partialVolumeDescriptor) => {
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

export default useImageSource;
