import { dicomImageExtractor } from '@utrad-ical/circus-lib';
import { parentPort } from 'worker_threads';

if (!parentPort) throw new Error('Worker invoked incorrectly');

const extract = dicomImageExtractor();

parentPort!.on('message', (buffer: ArrayBuffer) => {
  const result = extract(buffer);
  parentPort!.postMessage(result);
});
