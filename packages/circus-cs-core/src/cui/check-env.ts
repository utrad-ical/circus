import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import DockerRunner from '../util/DockerRunner';
import isDirectory from '../util/isDirectory';
import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import config from '../config';
import Queue from '../job/queue/Queue';

const checkEnv: FunctionService<
  Command,
  {
    dockerRunner: DockerRunner;
    queue: Queue<circus.PluginJobRequest>;
    pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
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
          return `Working dir: ${pWorkingDir}`;
        }
      },
      {
        title: 'Docker connection',
        fn: async () => {
          const out = await dockerRunner.run({ Image: 'hello-world' });
          if (!/Hello from Docker/.test(out))
            throw new Error(
              'Docker did not respond correctly.\n' +
                'Install "hello-world" image and try again.'
            );
        }
      },
      {
        title: 'Docker dicom_voxel_dump Image',
        fn: async () => {
          const dockerImage = 'circus/dicom_voxel_dump:1.0';
          const out = await dockerRunner.run({
            Image: dockerImage,
            Cmd: ['--help'],
            HostConfig: { AutoRemove: false }
          });
          if (!/Usage: dicom_voxel_dump/.test(out)) {
            throw new Error('Unexpected output from dicom_voxel_dump.');
          }
        }
      },
      {
        title: 'Queue',
        fn: async () => {
          const list = await queue.list();
          return `Found ${list.length} entries in the queue.`;
        }
      },
      {
        title: 'Plugin definitions',
        fn: async () => {
          const list = await pluginDefinitionAccessor.list();
          return `Found ${list.length} plug-in entries.`;
        }
      }
    ];
    let passedCount = 0;
    for (const entry of checkEntries) {
      try {
        process.stdout.write(
          (entry.title + ' '.repeat(35)).substr(0, 35) + ': '
        );
        const message = await entry.fn();
        process.stdout.write(chalk.cyanBright('[OK]\n'));
        if (message) console.log('  ' + chalk.gray(message));
        passedCount++;
      } catch (e) {
        process.stdout.write(chalk.redBright('[NG]\n'));
        console.error('  ' + e.message);
      }
    }
    if (passedCount === checkEntries.length) {
      console.log(chalk.cyanBright('All checks passed.'));
    } else {
      console.log(chalk.red('Check the installation guide.'));
    }
  };
};

checkEnv.dependencies = ['dockerRunner', 'queue', 'pluginDefinitionAccessor'];

export default checkEnv;
