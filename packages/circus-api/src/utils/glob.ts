import { glob as fsGlob } from 'node:fs/promises';

/**
 * Returns the paths matching the pattern, sorted like the `glob` package does
 * (`fs.glob` returns them in the order of the directory entries).
 */
const glob = async (pattern: string): Promise<string[]> => {
  const files: string[] = [];
  for await (const file of fsGlob(pattern)) files.push(file);
  return files.sort();
};

export default glob;
