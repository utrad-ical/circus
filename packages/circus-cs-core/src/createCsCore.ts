import { FunctionService } from '@utrad-ical/circus-lib';
import { PluginJobRegisterer } from './job/registerer/createPluginJobRegisterer';
import Queue, { Item } from './job/queue/Queue';

/**
 * A facade interface that abstracts the complex dependencies.
 */
export interface CsCore {
  // Daemon controller
  daemon: circus.DaemonController;
  // plugin handler
  plugin: circus.PluginDefinitionAccessor;
  // job handler
  job: {
    list: () => Promise<Item<circus.PluginJobRequest>[]>;
    register: (
      jobId: string,
      payload: circus.PluginJobRequest,
      priority?: number
    ) => Promise<void>;
  };
}

const createCsCore: FunctionService<
  CsCore,
  {
    daemonController: circus.DaemonController;
    pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
    queue: Queue<circus.PluginJobRequest>;
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
