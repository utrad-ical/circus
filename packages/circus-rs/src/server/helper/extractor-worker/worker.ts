import { dicomImageExtractor } from '@utrad-ical/circus-lib';
import { parentPort, threadId } from 'worker_threads';

if (!parentPort) throw new Error('Worker invoked incorrectly');

const extract = dicomImageExtractor();

let count = 0;

parentPort!.on('message', (buffer: ArrayBuffer) => {
  // console.log('start', threadId, ++count);
  const result = extract(buffer);
  parentPort!.postMessage(result);
});
