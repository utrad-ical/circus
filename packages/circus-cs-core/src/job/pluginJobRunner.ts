import { PluginJobRequest } from '../interface';
import { PluginJobReporter } from './pluginJobReporter';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface PluginJobRunner {
  process: (jobId: string, job: PluginJobRequest) => Promise<void>;
}

type WorkDirType = 'in' | 'out' | 'dicom';

export default function pluginJobRunner(deps: {
  jobReporter: PluginJobReporter;
  tempDir: string;
}): PluginJobRunner {
  const { jobReporter, tempDir } = deps;

  const baseDir = (jobId: string) => {
    if (typeof jobId !== 'string' || !jobId.length) throw new Error();
    return path.join(tempDir, jobId);
  };

  const workDir = (jobId: string, type: WorkDirType) => {
    return path.join(baseDir(jobId), type);
  };

  const preProcess = async (jobId: string, job: PluginJobRequest) => {
    // Prepare working directories
    await fs.ensureDir(baseDir(jobId));
    await Promise.all([
      fs.ensureDir(workDir(jobId, 'in')),
      fs.ensureDir(workDir(jobId, 'out')),
      fs.ensureDir(workDir(jobId, 'dicom'))
    ]);
  };

  const mainProcess = async (jobId: string, job: PluginJobRequest) => {};

  const postProcess = async (jobId: string, job: PluginJobRequest) => {
    // await fs.remove(baseDir(jobId));
  };

  const process = async (jobId: string, job: PluginJobRequest) => {
    try {
      await jobReporter.report(jobId, 'processing');
      await preProcess(jobId, job);
      await mainProcess(jobId, job);
      await postProcess(jobId, job);
      await jobReporter.report(jobId, 'finished');
    } catch (e) {
      jobReporter.report(jobId, 'error');
    }
  };
  return { process };
}
