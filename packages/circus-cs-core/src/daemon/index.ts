/**
 * This is a main job manager which contains the main loop.
 * This program is not to meant to be invoked directly.
 * @module
 */
import argv from 'argv';
import { ConfigLoadError } from '@utrad-ical/circus-lib/config';
import loadCsConfig from '../config/index.ts';
import configureServiceLoader from '../configureServiceLoader.ts';
import type { LoopRunOptions } from './loopRun.ts';
import loopRun from './loopRun.ts';
import createCancellableTimer from './createCancellableTimer.ts';
import { createStdoutLogger, ServiceLoader } from '@utrad-ical/circus-lib';
import type * as circus from '../interface.ts';

argv.option([
  {
    name: 'config-content',
    type: 'string',
    description: 'JSON string of config object'
  }
]);

const main = async () => {
  const { options } = argv.run();
  const configContent = options['config-content'];

  let loopRunOptions: LoopRunOptions<circus.PluginJobRequest> | undefined;
  try {
    const config: circus.Configuration = configContent
      ? JSON.parse(configContent)
      : await loadCsConfig();
    const serviceLoader = configureServiceLoader(new ServiceLoader(config));
    loopRunOptions = await createLoopRunOptions(config, serviceLoader);
    await loopRun<circus.PluginJobRequest>(loopRunOptions, process);
    process.exit(0);
  } catch (err) {
    const logger = loopRunOptions?.logger ?? createStdoutLogger('cs-core');
    logger.error(
      { err },
      err instanceof ConfigLoadError ? err.message : 'CIRCUS CS daemon failed'
    );
    process.exit(1);
  }
};

async function createLoopRunOptions(
  config: circus.Configuration,
  serviceLoader: ReturnType<typeof configureServiceLoader>
): Promise<LoopRunOptions<circus.PluginJobRequest>> {
  const [logger, queue, jobRunner] = await Promise.all([
    serviceLoader.get('csCoreDaemonLogger'),
    serviceLoader.get('queue'),
    serviceLoader.get('jobRunner')
  ]);

  const dispose = () => serviceLoader.dispose();

  const cancellableTimer = createCancellableTimer(
    config.jobManager.options.checkQueueInterval
  );

  return {
    logger,
    queue,
    cancellableTimer,
    run: jobRunner.run,
    dispose
  };
}

main();
