import { DicomImageData, FunctionService } from '@utrad-ical/circus-lib';
import { Worker } from 'worker_threads';
import { Pool } from 'tarn';
import path from 'path';
import os from 'os';

export type DicomExtractorWorker = (
  input: ArrayBuffer
) => Promise<DicomImageData>;

interface Options {
  /**
   * The number of maximum worker threds.
   * Defaults to the number of CPUs retreived using `os.cpus().length`;
   */
  maxConcurrency?: number;
}

const workerMain = path.join(__dirname, 'workerMain.js');

const createDicomExtractorWorker: FunctionService<
  DicomExtractorWorker,
  {},
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

  return (input: ArrayBuffer) => {
    return new Promise<DicomImageData>((resolve, reject) => {
      pool.acquire().promise.then(worker => {
        const cb = (result: DicomImageData) => {
          resolve(result);
          worker.off('message', cb);
          pool.release(worker);
        };
        worker.on('message', cb);
        worker.postMessage(input);
      });
    });
  };
};

export default createDicomExtractorWorker;
