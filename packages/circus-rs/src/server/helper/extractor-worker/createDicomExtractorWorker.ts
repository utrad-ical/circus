import type { NoDepFunctionService } from '@utrad-ical/circus-lib';
import type { DicomImageData } from '../../../dicom/dicomImageExtractor.ts';
import { MessageChannel, Worker } from 'worker_threads';
import { Pool } from 'tarn';
import path from 'path';
import os from 'os';

export interface DicomExtractorWorker {
  (input: ArrayBuffer): Promise<DicomImageData>;
  dispose: () => Promise<void>;
}

interface Options {
  /**
   * The number of maximum worker threds.
   * Defaults to the number of CPUs retreived using `os.cpus().length`;
   */
  maxConcurrency?: number;
}

// `worker.ts` in the source tree, `worker.js` in the published package
const workerMain = path.join(
  import.meta.dirname,
  'worker' + path.extname(import.meta.filename)
);

const createDicomExtractorWorker: NoDepFunctionService<
  DicomExtractorWorker,
  Options
> = async (options = {}) => {
  const { maxConcurrency = os.cpus().length } = options;
  let destroyed = false;

  const pool = new Pool({
    create: () => new Worker(workerMain),
    destroy: async (worker: Worker) => await worker.terminate(),
    // A worker that has exited has the thread ID -1
    validate: (worker: Worker) => worker.threadId !== -1,
    min: 1, // always keep at least one thread
    max: maxConcurrency,
    propagateCreateError: true
  });

  const run = (worker: Worker, input: ArrayBuffer) =>
    new Promise<DicomImageData>((resolve, reject) => {
      // Each request has its own channel, because the parent port also
      // carries messages from Node itself (e.g., `{ 'watch:import': [...] }`
      // reported to the parent when running with `node --watch`)
      const { port1, port2 } = new MessageChannel();
      const finish = () => {
        port1.close();
        worker.off('error', handleError);
        worker.off('exit', handleExit);
        pool.release(worker);
      };
      const handleError = (err: Error) => {
        finish();
        reject(err);
      };
      const handleExit = (code: number) => {
        finish();
        reject(new Error(`DICOM extractor worker exited with code ${code}`));
      };
      port1.once('message', (result: DicomImageData | string) => {
        finish();
        if (typeof result === 'string') {
          // string result means an error
          reject(new Error(result));
        } else {
          resolve(result);
        }
      });
      worker.once('error', handleError);
      worker.once('exit', handleExit);
      worker.postMessage({ input, port: port2 }, [port2]);
    });

  const extract = async (input: ArrayBuffer) => {
    if (destroyed) throw new Error('Worker pool has been destroyed');
    const worker = await pool.acquire().promise;
    return await run(worker, input);
  };

  extract.dispose = async () => {
    destroyed = true;
    await pool.destroy();
  };

  return extract;
};

export default createDicomExtractorWorker;
