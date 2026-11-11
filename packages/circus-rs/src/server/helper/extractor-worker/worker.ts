import dicomImageExtractor from '../../../dicom/dicomImageExtractor.ts';
import { type MessagePort, parentPort } from 'worker_threads';

if (!parentPort) throw new Error('Worker invoked incorrectly');

const extract = dicomImageExtractor();

parentPort!.on(
  'message',
  ({ input, port }: { input: ArrayBuffer; port: MessagePort }) => {
    try {
      const result = extract(input);
      port.postMessage(result);
    } catch (err: any) {
      // returning a string means an error
      port.postMessage(
        typeof err === 'string' ? err : (err.message ?? 'Unknown error')
      );
    }
  }
);
