import type koa from 'koa';
import Router from 'koa-router';

import type ImageEncoder from '../../helper/image-encoder/ImageEncoder.ts';
import type {
  VolumeProvider,
  VolumeAccessor
} from '../../helper/createVolumeProvider.ts';

import loadFromVolumeProvider from './loadFromVolumeProvider.ts';
import metadata from './metadata.ts';
import volume from './volume.ts';
import scan from './scan.ts';
import type { FunctionService, Logger } from '@utrad-ical/circus-lib';
import type PartialVolumeDescriptor from '../../../volume/PartialVolumeDescriptor.ts';

export interface SeriesMiddlewareState {
  volumeAccessor: VolumeAccessor;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
  query?: any;
}

const createSeriesRoutes: FunctionService<
  koa.Middleware,
  {
    rsLogger: Logger;
    volumeProvider: VolumeProvider;
    imageEncoder: ImageEncoder;
  }
> = async (opts, { rsLogger, volumeProvider, imageEncoder }) => {
  const router = new Router<SeriesMiddlewareState, any>();
  const load = loadFromVolumeProvider({ logger: rsLogger, volumeProvider });
  router.use('/', load);
  router.get('/metadata', metadata());
  router.get('/volume', volume());
  router.get('/scan', scan({ imageEncoder }));
  return router.routes() as any as koa.Middleware;
};

createSeriesRoutes.dependencies = [
  'rsLogger',
  'volumeProvider',
  'imageEncoder'
];

export default createSeriesRoutes;
