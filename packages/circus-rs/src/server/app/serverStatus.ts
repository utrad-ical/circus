import koa from 'koa';
import { RsServices } from '../helper/createServiceLoader';
import { AsyncCachedLoader } from '../../common/asyncMemoize';
import { VolumeAccessor } from '../helper/createVolumeProvider';

type MiddlewareOptions = {
  config: any;
  modules: RsServices;
};
const startUpTime: Date = new Date(); // The time this module was loaded

export default function serverStatus(
  options: MiddlewareOptions
): koa.Middleware {
  const { config, modules } = options;
  const { counter, volumeProvider } = modules;

  return async function serverStatus(
    ctx: koa.DefaultContext,
    next: koa.Next
  ): Promise<void> {
    const status: any = {
      status: 'Running',
      process: {
        memoryUsage: process.memoryUsage(),
        upTime: process.uptime(),
        upSince: startUpTime.toISOString()
      },
      counter: counter.getCounts(),
      config
    };
    if (volumeProvider && (volumeProvider as any).getCount) {
      status.cache = {
        count: (volumeProvider as AsyncCachedLoader<VolumeAccessor>).getCount(),
        size: (volumeProvider as AsyncCachedLoader<VolumeAccessor>).getLength()
      };
    }

    ctx.body = status;
  };
}
