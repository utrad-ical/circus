import { promises as fs } from 'node:fs';

/**
 * Check if the given file exists
 */
const fileExists = async (path: string) => {
  try {
    await fs.access(path);
    return true;
  } catch (err) {
    return false;
  }
};

export default fileExists;
