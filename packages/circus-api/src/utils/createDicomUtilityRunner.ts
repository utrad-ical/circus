import { Pool, TimeoutError } from 'tarn';
import cp, { ChildProcessWithoutNullStreams } from 'child_process';
import split from 'split';

interface Options {
  maxConcurrency: number;
  dockerImage: string;
}

export interface DicomUtilityRunner {
  compress: (buf: ArrayBuffer) => Promise<ArrayBuffer>;
  dispose: () => Promise<void>;
}

const createDicomUtilityRunner = async (options: Options) => {
  const finishedMap = new WeakMap<cp.ChildProcessWithoutNullStreams, boolean>();

  const pool = new Pool({
    create: () => {
      return new Promise<ChildProcessWithoutNullStreams>((resolve, reject) => {
        const dockerImage = options.dockerImage;
        const childProcess = cp.spawn('docker', [
          'run',
          // '--pull=never', enable this in the future
          '--rm',
          '-i',
          dockerImage,
          '-i'
        ]);
        const errorHandler = (err: Error) => {
          childProcess.stdout.unpipe();
          reject(err);
        };
        childProcess.on('error', errorHandler);
        childProcess.on('close', () => finishedMap.set(childProcess, true));
        childProcess.stderr.pipe(split()).on('data', line => {
          childProcess.kill();
          reject(new Error(line));
        });
        childProcess.stdout.pipe(split()).on('data', line => {
          if (line !== 'Ready') {
            // Sends SIGTERM, which is the default of `kill` command
            childProcess.kill();
            reject(new Error('Container did not return "Ready."'));
            return;
          }
          childProcess.stdout.unpipe();
          childProcess.stderr.unpipe();
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
    max: options.maxConcurrency,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 3000,
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
        childProcess.stdout.unpipe();
        childProcess.stderr.unpipe();
        pool.release(childProcess);
      };
      childProcess.on('error', errorHandler);
      childProcess.stdout.on('error', errorHandler);
      childProcess.stderr.on('error', errorHandler);
      childProcess.stdin.on('error', errorHandler);

      childProcess.stderr.pipe(split()).on('data', line => {
        if (!line.length) return;
        reject(new Error(line));
      });

      let count = 0;
      childProcess.stdout.pipe(split()).on('data', (line: string) => {
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
  } as DicomUtilityRunner;
};

export default createDicomUtilityRunner;
