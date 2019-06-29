import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import os from 'os';
import { executePlugin } from '../job/pluginJobRunner';
import buildDicomVolumes from '../job/buildDicomVolumes';
import path from 'path';
import fs from 'fs-extra';
import DockerRunner from '../util/DockerRunner';
import { PluginDefinition } from '../interface';

/**
 * Directly runs the specified plug-in without using a queue system.
 * The source DICOM files can be stored in a local directory (with -d option).
 * Existing content of the output directory will be erased.
 */
const runPlugin: FunctionService<
  Command,
  {
    dockerRunner: DockerRunner;
  }
> = async (options, deps) => {
  const { dockerRunner } = deps;
  return async (commandName, args) => {
    const {
      _: [pluginId, ...seriesUidOrDirectories],
      d,
      keep, // keep work directory
      work = os.tmpdir(),
      out: resultsDir
    } = args;
    if (!pluginId) {
      throw new Error('Plug-in ID is not specified.');
    }
    if (!resultsDir) {
      throw new Error('An result directory must be specified.');
    }
    fs.ensureDir(resultsDir);

    // Prepare working directory
    const workDir = path.resolve(work);
    const wStat = await fs.stat(workDir);
    if (!wStat.isDirectory()) {
      throw new Error('Work directory does not exist.');
    }

    const inDir = path.join(path.resolve(workDir), 'in');
    const outDir = path.join(path.resolve(workDir), 'out');
    await fs.ensureDir(inDir);
    await fs.ensureDir(outDir);
    if (seriesUidOrDirectories.length !== 1) {
      throw new Error('Specify only one series.');
    }
    for (let i = 0; i < seriesUidOrDirectories.length; i++) {
      const target = seriesUidOrDirectories[i] as string;
      if (d) {
        // use directory
        console.log(`Preparing volume from ${target}...`);
        await buildDicomVolumes(dockerRunner, [target], inDir);
      } else {
        // use dicom file repository
        throw new Error('Not implemented');
      }
    }
    const pluginDefinition = ({ pluginId } as unknown) as PluginDefinition;
    console.log('Executing the plug-in...');
    await executePlugin(dockerRunner, pluginDefinition, inDir, outDir);

    console.log('Copying the results...');
    await fs.copy(outDir, resultsDir, { recursive: true });
    if (!keep) {
      fs.emptyDir(workDir);
    }
  };
};

runPlugin.dependencies = ['dockerRunner', 'dicomFileRepository'];

export default runPlugin;
