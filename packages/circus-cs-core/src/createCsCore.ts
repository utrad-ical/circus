import type { FunctionService } from '@utrad-ical/circus-lib';
import type { PluginJobRegisterer } from './job/registerer/createPluginJobRegisterer.ts';
import type * as circus from './interface.ts';

const createCsCore: FunctionService<
  circus.CsCore,
  {
    daemonController: circus.DaemonController;
    pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
    queue: circus.PluginJobRequestQueue;
    pluginJobRegisterer: PluginJobRegisterer;
  }
> = async (options, deps) => {
  // This is a simple facade, make it simple!

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
      register: pluginJobRegisterer.register,
      removeFromQueue: queue.removeFromQueue
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
