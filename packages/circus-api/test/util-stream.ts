import delay from '../src/utils/delay';
import { Readable } from 'stream';

export const readFromStream = (stream: Readable): (() => Promise<string>) => {
  let data = '';
  stream.on('data', chunk => {
    data += chunk;
  });
  return async () => {
    await delay(10);
    stream.destroy();
    return data;
  };
};
