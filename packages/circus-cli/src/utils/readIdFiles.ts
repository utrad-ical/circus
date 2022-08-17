import { promises as fs } from 'node:fs';

const readIdFiles = async (files: string[]): Promise<string[]> => {
  const results = await Promise.all(
    files.map(async file => {
      return (await fs.readFile(file, 'utf8'))
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length && !line.startsWith('#'));
    })
  );
  return Array.from(new Set(results.flat()));
};

export default readIdFiles;
