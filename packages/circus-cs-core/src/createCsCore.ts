import { FunctionService } from '@utrad-ical/circus-lib';
import { DaemonController } from './daemon/createDaemonController';
import { PluginJobRequest } from './interface';
import { PluginJobRegisterer } from './job/registerer/createPluginJobRegisterer';
import PluginDefinitionAccessor from './plugin-definition-accessor/PluginDefinitionAccessor';
import Queue, { Item } from './queue/Queue';

/**
 * A facade interface that abstracts the complex dependencies.
 */
export interface CsCore {
  // Daemon controller
  daemon: DaemonController;
  // plugin handler
  plugin: PluginDefinitionAccessor;
  // job handler
  job: {
    list: () => Promise<Item<PluginJobRequest>[]>;
    register: (
      jobId: string,
      payload: PluginJobRequest,
      priority?: number
    ) => Promise<void>;
  };
}

const createCsCore: FunctionService<
  CsCore,
  {
    daemonController: DaemonController;
    pluginDefinitionAccessor: PluginDefinitionAccessor;
    queue: Queue<PluginJobRequest>;
    pluginJobRegisterer: PluginJobRegisterer;
  }
> = async (options, deps) => {
  const {
    daemonController,
    pluginDefinitionAccessor,
    queue,
    pluginJobRegisterer
  } = deps;

  return {
    daemon: daemonController,
    plugin: pluginDefinitionAccessor,
    job: {
      list: queue.list,
      register: pluginJobRegisterer.register
    }
  };
};

createCsCore.dependencies = [
  'daemonController',
  'pluginDefinitionAccessor',
  'queue',
  'pluginJobRegisterer'
];

export default createCsCore;
