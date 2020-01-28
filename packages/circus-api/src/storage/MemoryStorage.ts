import Storage from './Storage';
import { NoDepFunctionService } from '@utrad-ical/circus-lib';

const createMemoryStorage: NoDepFunctionService<Storage> = async () => {
  const store = new Map<string, Buffer>();

  const read = async (key: string) => {
    if (store.has(key)) {
      return Buffer.from(store.get(key)!);
    } else {
      throw new Error('not found');
    }
  };

  const write = async (key: string, data: Buffer) => {
    store.set(key, data);
  };

  const remove = async (key: string) => {
    store.delete(key);
  };

  const exists = async (key: string) => store.has(key);

  const toString = () => 'MemoryStorage';

  return { read, write, remove, exists, toString } as Storage;
};

export default createMemoryStorage;
