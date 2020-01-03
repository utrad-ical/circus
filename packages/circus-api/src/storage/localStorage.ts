import fs from 'fs-extra';
import * as path from 'path';
import Storage from './Storage';

interface Options {
  root: string;
  nameToPath?: (name: string) => string;
}

const localStorage = async (params: Options) => {
  const { root, nameToPath = (n: string) => n } = params;

  if (!root || !(await fs.pathExists(root))) {
    throw new Error(`Root directory "${root}" does not exist.`);
  }

  const buildPath = (key: string) => path.join(root, nameToPath(key));

  const read = async (key: string) => await fs.readFile(buildPath(key));

  const write = async (key: string, data: Buffer) =>
    await fs.outputFile(buildPath(key), data);

  const remove = async (key: string) => await fs.unlink(buildPath(key));

  const exists = async (key: string) => await fs.pathExists(buildPath(key));

  return { read, write, remove, exists } as Storage;
};

export default localStorage;
