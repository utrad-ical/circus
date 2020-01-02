import localStorage from './localStorage';
import memoryStorage from './memoryStorage';

/**
 * Provides simple asynchronous key-value storage.
 */
export default async function createStorage(
  type: 'local' | 'memory',
  params: any = {}
) {
  switch (type) {
    case 'local':
      return await localStorage(params);
    case 'memory':
      return await memoryStorage();
  }
  throw Error('This storage type is not supported');
}
