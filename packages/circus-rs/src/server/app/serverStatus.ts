import type { Handler } from 'hono';
import type { RsEnv } from '../types.ts';
import type { RsServices } from '../configureServiceLoader.ts';
import type { AsyncCachedLoader } from '../../common/asyncMemoize.ts';
import type { VolumeAccessor } from '../helper/createVolumeProvider.ts';

type MiddlewareOptions = {
  config: any;
  modules: RsServices;
};
const startUpTime: Date = new Date(); // The time this module was loaded

export default function serverStatus(
  options: MiddlewareOptions
): Handler<RsEnv> {
  const { config, modules } = options;
  const { counter, volumeProvider } = modules;

  return ctx => {
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

    return ctx.json(status);
  };
}
