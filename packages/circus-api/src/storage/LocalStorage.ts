import fs from 'node:fs/promises';
import * as path from 'path';
import type Storage from './Storage.ts';
import type { NoDepFunctionService } from '@utrad-ical/circus-lib';

const pathExists = (p: string) =>
  fs.access(p).then(
    () => true,
    () => false
  );

interface Options {
  dataDir: string;
  nameToPath?: (name: string) => string;
}

const createLocalStorage: NoDepFunctionService<Storage> = async (
  options: Options
) => {
  const { dataDir, nameToPath = (n: string) => n } = options;

  if (!dataDir || !(await pathExists(dataDir))) {
    throw new Error(`Root directory "${dataDir}" does not exist.`);
  }

  const buildPath = (key: string) => path.join(dataDir, nameToPath(key));

  const read = async (key: string) => await fs.readFile(buildPath(key));

  const write = async (key: string, data: Buffer) => {
    const file = buildPath(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  };

  const remove = async (key: string) => await fs.unlink(buildPath(key));

  const exists = async (key: string) => await pathExists(buildPath(key));

  const toString = () => `LocalStorage { dataDir: '${dataDir}' }`;

  return { read, write, remove, exists, toString } as Storage;
};

export default createLocalStorage;
