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

export const readFromStreamTillEnd = (stream: Readable) => {
  return new Promise<string>(resolve => {
    let data = '';
    stream.on('data', chunk => {
      data += chunk;
    });
    stream.on('end', () => resolve(data));
  });
};
