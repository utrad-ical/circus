import localStorage from './localStorage';
import memoryStorage from './memoryStorage';

/**
 * Provides simple asynchronous key-value storage.
 */
const createStorage = async (type: 'local' | 'memory', params: any = {}) => {
  switch (type) {
    case 'local':
      return await localStorage(params);
    case 'memory':
      return await memoryStorage();
  }
  throw Error('This storage type is not supported');
};

export default createStorage;
