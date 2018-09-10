import fs from 'fs';

/**
 * Asynchronouslly checks if the path exists and is a directory.
 * @param path The path to check.
 */
export default function isDirectory(path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve(false);
        } else {
          reject(err);
        }
      } else {
        resolve(stats.isDirectory());
      }
    });
  });
}
