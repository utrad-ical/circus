import { PluginJobRequest } from './interface';
import DependentModuleLoader from '@utrad-ical/circus-lib/lib/DependentModuleLoader';
import { CsCore, PluginDefinitionAccessor } from './CsCore';
import { DaemonController } from './daemon/createDaemonController';
import { QueueSystem } from './queue/queue';
import { PluginJobRegisterer } from './job/createPluginJobRegisterer';

interface CsCoreDeps {
  dispose: () => Promise<void>;
  daemonController: DaemonController;
  pluginDefinitionAccessor: PluginDefinitionAccessor;
  queueSystem: QueueSystem<PluginJobRequest>;
  pluginJobRegisterer: PluginJobRegisterer;
}

export function makeCsCore<T extends CsCoreDeps>(
  loader: DependentModuleLoader<T>
): CsCore {
  const notPrepared: string[] = [
    'dispose',
    'daemonController',
    'pluginDefinitionAccessor',
    'queueSystem',
    'pluginJobRegisterer'
  ].filter(i => !loader.ready(i as keyof CsCoreDeps));

  if (notPrepared.length > 0)
    throw new Error('Requre dependency: ' + notPrepared.join(', '));

  const daemon: CsCore['daemon'] = {
    start: async () => (await loader.load('daemonController')).start(),
    stop: async () => (await loader.load('daemonController')).stop(),
    status: async () => (await loader.load('daemonController')).status(),
    pm2list: async () => (await loader.load('daemonController')).pm2list(),
    pm2killall: async () => (await loader.load('daemonController')).pm2killall()
  };
  const plugin: CsCore['plugin'] = {
    list: async () => (await loader.load('pluginDefinitionAccessor')).list(),
    get: async (pluginId: string) =>
      (await loader.load('pluginDefinitionAccessor')).get(pluginId)
  };
  const job: CsCore['job'] = {
    register: async (
      jobId: string,
      payload: PluginJobRequest,
      priority?: number
    ) =>
      (await loader.load('pluginJobRegisterer')).register(
        jobId,
        payload,
        priority
      ),
    list: async () => (await loader.load('queueSystem')).list()
  };
  const dispose: CsCore['dispose'] = async () => {
    const fn = await loader.load('dispose');
    fn();
  };
  return { daemon, plugin, job, dispose };
}
