import { dicomImageExtractor } from '@utrad-ical/circus-lib';
import { parentPort, threadId } from 'worker_threads';

if (!parentPort) throw new Error('Worker invoked incorrectly');

const extract = dicomImageExtractor();

parentPort!.on('message', (buffer: ArrayBuffer) => {
  try {
    const result = extract(buffer);
    parentPort!.postMessage(result);
  } catch (err) {
    // returning a string means an error
    parentPort!.postMessage(
      typeof err === 'string' ? err : err.message ?? 'Unknown error'
    );
  }
});
