import glob from 'glob-promise';
import * as path from 'path';

const scanMigrationFiles = async () => {
  const results: string[] = [];
  const files = await glob(
    path.resolve(__dirname, '../scripts/migrations', '*')
  );
  files.forEach(file => {
    try {
      const base = path.basename(file);
      const rev = parseInt(/^(\d+)/.exec(base)![0], 10);
      if (rev <= 0) throw new RangeError('rev: ' + rev);
      results[rev] = file;
    } catch (err) {
      throw new Error('Invalid migration file name format: ' + err.message);
    }
  });
  if (results.length !== files.length + 1) {
    throw new Error('Migration files are not named sequentially.');
  }
  return results;
};

export default scanMigrationFiles;
