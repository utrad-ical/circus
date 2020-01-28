import fs from 'fs-extra';
import * as path from 'path';
import Storage from './Storage';
import { NoDepFunctionService } from '@utrad-ical/circus-lib';

interface Options {
  dataDir: string;
  nameToPath?: (name: string) => string;
}

const createLocalStorage: NoDepFunctionService<Storage> = async (
  options: Options
) => {
  const { dataDir, nameToPath = (n: string) => n } = options;

  if (!dataDir || !(await fs.pathExists(dataDir))) {
    throw new Error(`Root directory "${dataDir}" does not exist.`);
  }

  const buildPath = (key: string) => path.join(dataDir, nameToPath(key));

  const read = async (key: string) => await fs.readFile(buildPath(key));

  const write = async (key: string, data: Buffer) =>
    await fs.outputFile(buildPath(key), data);

  const remove = async (key: string) => await fs.unlink(buildPath(key));

  const exists = async (key: string) => await fs.pathExists(buildPath(key));

  const toString = () => `LocalStorage { dataDir: '${dataDir}' }`;

  return { read, write, remove, exists, toString } as Storage;
};

export default createLocalStorage;
