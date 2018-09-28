import { PluginJobRequest } from './interface';
import DependentModuleLoader from './DependentModuleLoader';
import { CsCore } from "./CsCore";
import { DaemonController } from './daemon/createDaemonController';
import { PluginDefinitionAccessor } from './util/pluginDefinitionsAccessor';
import { QueueSystem } from './queue/queue';
import { PluginJobRegisterer } from './job/createPluginJobRegisterer';

interface CsCoreDeps {
  dispose: () => Promise<void>;
  daemonController: DaemonController;
  pluginDefinitionsAccessor: PluginDefinitionAccessor;
  queueSystem: QueueSystem<PluginJobRequest>;
  pluginJobRegisterer: PluginJobRegisterer;
}

export function makeCsCore<T extends CsCoreDeps>(loader: DependentModuleLoader<T>): CsCore {
  const notPrepared: string[] = [
    'dispose',
    'daemonController',
    'pluginDefinitionsAccessor',
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
    update: async (pluginDefinitions) => (await loader.load('pluginDefinitionsAccessor')).save(pluginDefinitions),
    list: async () => (await loader.load('pluginDefinitionsAccessor')).load()
  };
  const job: CsCore['job'] = {
    register: async (jobId: string, payload: PluginJobRequest, priority?: number) => (await loader.load('pluginJobRegisterer')).register(jobId, payload, priority),
    list: async () => (await loader.load('queueSystem')).list()
  };
  const dispose: CsCore['dispose'] = async () => {
    const fn = await loader.load('dispose');
    fn();
  };
  return { daemon, plugin, job, dispose };
}