/**
 * This is a main job manager which contains the main loop.
 * This program is not to meant to be invoked directly.
 * @module
 */
import argv from 'argv';
import Configuration from '../config/Configuration';
import config from '../config';
import configureServiceLoader from '../configureServiceLoader';
import { PluginJobRequest } from '../interface';
import loopRun, { LoopRunOptions } from './loopRun';
import createCancellableTimer from './createCancellableTimer';

argv.option([
  {
    name: 'config-content',
    type: 'string',
    description: 'JSON string of config object'
  }
]);

const main = async () => {
  const { options } = argv.run();

  let ourConfig: Configuration | undefined = undefined;
  if (options['config-content']) {
    try {
      ourConfig = JSON.parse(options['config-content']);
    } catch (err) {
      console.error('Parsing of confing-content failed');
      process.exit(1);
    }
  } else {
    ourConfig = config;
  }

  const serviceLoader = configureServiceLoader(ourConfig!);

  let loopRunOptions: LoopRunOptions<PluginJobRequest>;
  try {
    loopRunOptions = await createLoopRunOptions(config!, serviceLoader);
    await loopRun<PluginJobRequest>(loopRunOptions!, process);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

async function createLoopRunOptions(
  config: Configuration,
  serviceLoader: ReturnType<typeof configureServiceLoader>
): Promise<LoopRunOptions<PluginJobRequest>> {
  const [logger, queue, jobRunner] = await Promise.all([
    serviceLoader.get('logger'),
    serviceLoader.get('queue'),
    serviceLoader.get('jobRunner')
  ]);

  const dispose = () => serviceLoader.dispose();

  const cancellableTimer = createCancellableTimer(
    config.jobManager.options.interval
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
