import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import DockerRunner from '../util/DockerRunner';
import isDirectory from '../util/isDirectory';
import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import config from '../config';
import Queue from '../job/queue/Queue';
import { PluginJobRequest } from '../interface';
import PluginDefinitionAccessor from '../plugin-definition-accessor/PluginDefinitionAccessor';

const checkEnv: FunctionService<
  Command,
  {
    dockerRunner: DockerRunner;
    queue: Queue<PluginJobRequest>;
    pluginDefinitionAccessor: PluginDefinitionAccessor;
  }
> = async (options, deps) => {
  const { dockerRunner, queue, pluginDefinitionAccessor } = deps;

  return async () => {
    const checkEntries = [
      {
        title: 'Plugin working directory',
        fn: async () => {
          const pWorkingDir = config.jobRunner.options.pluginWorkingDir;
          if (typeof pWorkingDir !== 'string') {
            throw new Error('Plugin working directory is not set.');
          }
          await fs.ensureDir(pWorkingDir);
          const tmpDir = path.join(pWorkingDir, 'env-check-test');
          await fs.remove(tmpDir);
          await fs.ensureDir(tmpDir);
          if (!(await isDirectory(tmpDir)))
            throw new Error('Failed to create job temporary directory.');
        }
      },
      {
        title: 'Docker connection',
        fn: async () => {
          const out = await dockerRunner.run({ Image: 'hello-world' });
          if (!/Hello from Docker/.test(out))
            throw new Error('Docker did not respond correctly.');
        }
      },
      {
        title: 'Queue',
        fn: async () => {
          await queue.list();
        }
      },
      {
        title: 'Plugin definitions',
        fn: async () => {
          await pluginDefinitionAccessor.list();
        }
      }
    ];
    for (const entry of checkEntries) {
      try {
        process.stdout.write(
          (entry.title + ' '.repeat(30)).substr(0, 30) + ': '
        );
        await entry.fn();
        process.stdout.write(chalk.cyanBright('[OK]\n'));
      } catch (e) {
        process.stdout.write(chalk.redBright('[NG]\n'));
        console.error('  ' + e.message);
      }
    }
    console.log(chalk.cyanBright('All check passed.'));
  };
};

checkEnv.dependencies = ['dockerRunner', 'queue', 'pluginDefinitionAccessor'];

export default checkEnv;
