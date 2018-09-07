import koa from 'koa';
import AsyncLruCache from '../../common/AsyncLruCache';
import { AppHelpers } from '../helper/loadHelperModules';

type MiddlewareOptions = {
  config: any;
  modules: AppHelpers;
};
const startUpTime: Date = new Date(); // The time this module was loaded

export default function serverStatus(
  options: MiddlewareOptions
): koa.Middleware {
  const { config, modules } = options;
  const { counter, cache } = modules;

  return async function serverStatus(ctx, next): Promise<void> {
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
    if(cache){
      status.cache = {
        count: cache.keys().length,
        size: cache.length
      }
    }

    ctx.body = status;
  };
}
