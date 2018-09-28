/**
 * This is a main job manager which contains the main loop.
 * This program is not to meant to be invoked directly.
 * @module
 */
import argv from 'argv';
import { Configuration } from './config/Configuration';
import configureLoader from "./configureLoader";
import { PluginJobRequest } from './interface';
import loopRun, { LoopRunOptions } from './daemon/loopRun';
import sleep from './util/sleep';

argv.option([
  {
    name: 'config-content',
    type: 'string',
    description: 'JSON string of config object'
  }
]);

export async function main() {
  const { targets, options } = argv.run();

  let config: Configuration | undefined = undefined;
  if (options['config-content']) {
    try {
      config = JSON.parse(options['config-content']);
    } catch (err) {
      console.error('Parsing confing-content is failed');
      process.exit(1);
    }
  }
  // Todo: accept config-file option

  if (!config) config = (await import('./config')).default;

  // Todo: validate config with utility like ajv

  if (!config) {
    console.error('Cannot get daemon config');
    process.exit(1);
  }

  let loopRunOptions: LoopRunOptions<PluginJobRequest>;
  try {
    loopRunOptions = await createLoopRunOptions(config);
    await loopRun<PluginJobRequest>(loopRunOptions!, process);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function createLoopRunOptions(
  config: Configuration
): Promise<LoopRunOptions<PluginJobRequest>> {
  const moduleLoader = configureLoader(config);

  const [logger, queue, jobRunner, dispose] = [
    await moduleLoader.load('logger'),
    await moduleLoader.load('queueSystem'),
    await moduleLoader.load('jobRunner'),
    await moduleLoader.load('dispose')
  ];

  const intervalController = createIntervalController(config.jobManager);

  return {
    logger,
    dequeue: queue.dequeue,
    run: jobRunner.run,
    settle: queue.settle,
    active: intervalController.active,
    interval: intervalController.interval,
    interrupt: intervalController.interrupt,
    dispose
  };
}

interface IntervalController {
  active: () => boolean;
  interrupt: () => void;
  interval: () => Promise<void>;
}

function createIntervalController(options: {
  checkQueueInterval: number;
}): IntervalController {
  const { checkQueueInterval } = options;

  let interrupted: boolean = false;
  const active = () => !interrupted;

  const interrupt = () => {
    interrupted = true;
  };

  const interval = async () => {
    const start = Date.now();
    while (start + checkQueueInterval > Date.now() && !interrupted)
      await sleep(100);
  };

  return {
    active,
    interval,
    interrupt
  };
}

main();
