import { DicomImageData, NoDepFunctionService } from '@utrad-ical/circus-lib';
import { Worker } from 'worker_threads';
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

const workerMain = path.join(__dirname, 'workerMain.js');

const createDicomExtractorWorker: NoDepFunctionService<
  DicomExtractorWorker,
  Options
> = async (options = {}) => {
  const { maxConcurrency = os.cpus().length } = options;

  const pool = new Pool({
    create: () => new Worker(workerMain),
    destroy: async (worker: Worker) => await worker.terminate(),
    min: 1, // always keep at least one thread
    max: maxConcurrency,
    propagateCreateError: true
  });

  const extract = (input: ArrayBuffer) => {
    return new Promise<DicomImageData>((resolve, reject) => {
      pool.acquire().promise.then(worker => {
        const cb = (result: DicomImageData | string) => {
          if (typeof result === 'string') {
            // string result means an error
            reject(new Error(result));
          } else {
            resolve(result);
          }
          worker.off('message', cb);
          pool.release(worker);
        };
        worker.on('message', cb);
        worker.postMessage(input);
      });
    });
  };

  extract.dispose = async () => {
    await pool.destroy();
  };

  return extract;
};

export default createDicomExtractorWorker;
