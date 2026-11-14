import { promises as fs } from 'node:fs';

const readIds = async (
  args: string[],
  fromFiles: boolean
): Promise<string[]> => {
  const ids = fromFiles
    ? await Promise.all(
        args.map(async file => {
          return (await fs.readFile(file, 'utf8'))
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length && !line.startsWith('#'));
        })
      ).then(arr => arr.flat())
    : args;
  return Array.from(new Set(ids));
};

export default readIds;
