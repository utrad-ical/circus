import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { compress } from 'hono/compress';
import type { FunctionService, Logger } from '@utrad-ical/circus-lib';
import type ImageEncoder from '../../helper/image-encoder/ImageEncoder.ts';
import type { VolumeProvider } from '../../helper/createVolumeProvider.ts';
import type { RsEnv } from '../../types.ts';
import loadFromVolumeProvider from './loadFromVolumeProvider.ts';
import metadata from './metadata.ts';
import { volume } from './volume.ts';
import scan from './scan.ts';

export type SeriesRoutes = (
  authorize?: MiddlewareHandler<RsEnv>
) => Hono<RsEnv>;

const createSeriesRoutes: FunctionService<
  SeriesRoutes,
  {
    logger: Logger;
    volumeProvider: VolumeProvider;
    imageEncoder: ImageEncoder;
  }
> = async (_options, { logger, volumeProvider, imageEncoder }) => {
  const load = loadFromVolumeProvider({
    logger: logger.child({ component: 'rs' }),
    volumeProvider
  });
  return (authorize = (_ctx, next) => next()) => {
    const app = new Hono<RsEnv>();
    app.get('/:sid/metadata', authorize, ...load, ...metadata());
    app.get('/:sid/volume', authorize, ...load, compress(), volume);
    app.get('/:sid/scan', authorize, ...load, ...scan({ imageEncoder }));
    return app;
  };
};

createSeriesRoutes.dependencies = ['logger', 'volumeProvider', 'imageEncoder'];

export default createSeriesRoutes;
