import cp from 'child_process';
import { pipeline, Readable } from 'stream';
import tarfs from 'tar-fs';
import exec from './exec';

/**
 * Utility to extract files from the specified docker image.
 * @param imageId The image ID.
 */
const createDockerFileExtractor = (imageId: string) => {
  let containerId: string;

  const prepareContainer = async () => {
    if (containerId) return;
    containerId = (await exec('docker', ['create', imageId])).trim();
  };

  /**
   * Returns the file(s) as a tar stream.
   * @param path The path in the Docker image.
   * @returns The tar stream containing the contents of the files.
   */
  const extract = async (path: string): Promise<Readable> => {
    await prepareContainer();
    const child = cp.spawn('docker', ['cp', `${containerId}:${path}`, '-']);
    return child.stdout;
  };

  /**
   * Copies the files/directory into the specified path.
   * @param srcPath The source path in the Docker image.
   * @param destPath The destination (local) directory.
   */
  const extractToPath = async (srcPath: string, destPath: string) => {
    await prepareContainer();
    return new Promise<void>((resolve, reject) => {
      const child = cp.spawn('docker', [
        'cp',
        `${containerId}:${srcPath}`,
        destPath
      ]);
      let stderr: string;
      child.stderr.on('data', data => (stderr += data));
      child.on('close', code => {
        if (code !== 0) reject(new Error('extractToPath error: ' + stderr));
        else resolve();
      });
    });
  };

  /**
   * Always call this to dispose the temporary container
   * (e.g., in a `finally` clause).
   */
  const dispose = async () => {
    if (!containerId) return;
    await exec('docker', ['rm', containerId]);
  };

  return { extract, extractToPath, dispose };
};

export default createDockerFileExtractor;
