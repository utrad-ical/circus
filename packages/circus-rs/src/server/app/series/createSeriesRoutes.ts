import koa from 'koa';
import Router from 'koa-router';

import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import ImageEncoder from '../../helper/image-encoder/ImageEncoder';
import {
  VolumeProvider,
  VolumeAccessor
} from '../../helper/createVolumeProvider';

import loadFromVolumeProvider from './loadFromVolumeProvider';
import metadata from './metadata';
import volume from './volume';
import scan from './scan';
import PartialVolumeDescriptor from '@utrad-ical/circus-lib/lib/PartialVolumeDescriptor';
import { FunctionService } from '@utrad-ical/circus-lib';

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
  const router = new Router();
  const load = loadFromVolumeProvider({ logger: rsLogger, volumeProvider });
  router.use('/', load);
  router.get('/metadata', metadata());
  router.get('/volume', volume());
  router.get('/scan', scan({ imageEncoder }));
  return (router.routes() as any) as koa.Middleware;
};

createSeriesRoutes.dependencies = [
  'rsLogger',
  'volumeProvider',
  'imageEncoder'
];

export default createSeriesRoutes;
