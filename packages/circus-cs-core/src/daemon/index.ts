/**
 * This is a main job manager which contains the main loop.
 * This program is not to meant to be invoked directly.
 * @module
 */
import argv from 'argv';
import config from '../config';
import configureServiceLoader from '../configureServiceLoader';
import loopRun, { LoopRunOptions } from './loopRun';
import createCancellableTimer from './createCancellableTimer';
import { ServiceLoader } from '@utrad-ical/circus-lib';
import * as circus from '../interface';

argv.option([
  {
    name: 'config-content',
    type: 'string',
    description: 'JSON string of config object'
  }
]);

const main = async () => {
  const { options } = argv.run();

  let ourConfig: circus.Configuration | undefined = undefined;
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

  const serviceLoader = configureServiceLoader(new ServiceLoader(), ourConfig!);

  let loopRunOptions: LoopRunOptions<circus.PluginJobRequest>;
  try {
    loopRunOptions = await createLoopRunOptions(config!, serviceLoader);
    await loopRun<circus.PluginJobRequest>(loopRunOptions!, process);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

async function createLoopRunOptions(
  config: circus.Configuration,
  serviceLoader: ReturnType<typeof configureServiceLoader>
): Promise<LoopRunOptions<circus.PluginJobRequest>> {
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
