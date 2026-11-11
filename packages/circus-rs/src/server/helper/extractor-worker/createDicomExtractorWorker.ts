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
    min: 1, // always keep at least one thread
    max: maxConcurrency,
    propagateCreateError: true
  });

  const extract = (input: ArrayBuffer) => {
    if (destroyed) return Promise.reject('Worker pool has been destroyed');
    return new Promise<DicomImageData>((resolve, reject) => {
      pool.acquire().promise.then(worker => {
        // Each request has its own channel, because the parent port also
        // carries messages from Node itself (e.g., `{ 'watch:import': [...] }`
        // reported to the parent when running with `node --watch`)
        const { port1, port2 } = new MessageChannel();
        port1.once('message', (result: DicomImageData | string) => {
          port1.close();
          pool.release(worker);
          if (typeof result === 'string') {
            // string result means an error
            reject(new Error(result));
          } else {
            resolve(result);
          }
        });
        worker.postMessage({ input, port: port2 }, [port2]);
      });
    });
  };

  extract.dispose = async () => {
    destroyed = true;
    await pool.destroy();
  };

  return extract;
};

export default createDicomExtractorWorker;
