import Storage from './Storage';

const memoryStorage = async () => {
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

  return { read, write, remove, exists } as Storage;
};

export default memoryStorage;
