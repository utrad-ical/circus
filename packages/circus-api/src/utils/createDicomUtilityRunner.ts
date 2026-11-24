import { Pool } from 'tarn';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import cp from 'child_process';
import readline from 'node:readline';
import type { NoDepFunctionService } from '@utrad-ical/circus-lib';
import { dicomUtilityRunnerDockerImage } from '../config/default.ts';

interface Options {
  maxConcurrency?: number;
  dockerImage?: string;
}

export interface DicomUtilityRunner {
  compress: (buf: ArrayBuffer) => Promise<ArrayBuffer>;
  dispose: () => Promise<void>;
}

/**
 * Calls `onLine` for each line of the stream until the returned function
 * is called, which detaches it from the stream.
 */
const readLines = (
  stream: NodeJS.ReadableStream,
  onLine: (line: string) => void
) => {
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  rl.on('line', onLine);
  return () => rl.close();
};

const createDicomUtilityRunner: NoDepFunctionService<
  DicomUtilityRunner
> = async (options: Options = {}) => {
  const finishedMap = new WeakMap<cp.ChildProcessWithoutNullStreams, boolean>();
  const {
    maxConcurrency = 3,
    dockerImage = dicomUtilityRunnerDockerImage // use defaults
  } = options;

  const pool = new Pool({
    create: () => {
      return new Promise<ChildProcessWithoutNullStreams>((resolve, reject) => {
        const childProcess = cp.spawn('docker', [
          'run',
          // '--pull=never', enable this in the future
          '--rm',
          '-i',
          dockerImage,
          '-i'
        ]);
        const errorHandler = (err: Error) => {
          closeStdout();
          reject(err);
        };
        childProcess.on('error', errorHandler);
        childProcess.on('close', () => finishedMap.set(childProcess, true));
        const closeStderr = readLines(childProcess.stderr, line => {
          childProcess.kill();
          reject(new Error(line));
        });
        const closeStdout = readLines(childProcess.stdout, line => {
          if (line !== 'Ready') {
            // Sends SIGTERM, which is the default of `kill` command
            childProcess.kill();
            reject(new Error('Container did not return "Ready."'));
            return;
          }
          closeStdout();
          closeStderr();
          childProcess.removeListener('error', errorHandler);
          resolve(childProcess);
        });
      });
    },
    validate: childProcess => finishedMap.get(childProcess) !== true,
    destroy: async (childProcess: cp.ChildProcessWithoutNullStreams) => {
      childProcess.stdin.end();
    },
    min: 0,
    max: maxConcurrency,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    createRetryIntervalMillis: 200,
    propagateCreateError: true
  });

  const compress = async (buffer: ArrayBuffer) => {
    const buf = Buffer.from(buffer);
    const base64 = buf.toString('base64');
    const request = '{"command":"modify","compress":true}';
    const childProcess = await pool.acquire().promise;

    return new Promise<ArrayBuffer>((resolve, reject) => {
      const errorHandler = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        childProcess.removeListener('error', errorHandler);
        childProcess.stdin.removeListener('error', errorHandler);
        childProcess.stdout.removeListener('error', errorHandler);
        childProcess.stderr.removeListener('error', errorHandler);
        closeStdout();
        closeStderr();
        pool.release(childProcess);
      };
      childProcess.on('error', errorHandler);
      childProcess.stdout.on('error', errorHandler);
      childProcess.stderr.on('error', errorHandler);
      childProcess.stdin.on('error', errorHandler);

      const closeStderr = readLines(childProcess.stderr, line => {
        if (!line.length) return;
        reject(new Error(line));
      });

      let count = 0;
      const closeStdout = readLines(childProcess.stdout, line => {
        switch (count++) {
          case 0:
            if (line !== 'OK') {
              cleanup();
              reject(new Error('Did not respond with "OK"'));
            }
            break;
          case 1: {
            const buf = Buffer.from(line, 'base64');
            cleanup();
            resolve(buf.buffer);
          }
        }
      });

      childProcess.stdin.write(`${request}\n${base64}\n`);
    });
  };

  return {
    compress,
    dispose: async () => {
      await pool.destroy();
    }
  };
};

export default createDicomUtilityRunner;
