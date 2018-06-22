import * as fs from 'fs';

export function isDir(dir: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.stat(dir, (err, stats) => {
      resolve(!err);
    });
  });
}
