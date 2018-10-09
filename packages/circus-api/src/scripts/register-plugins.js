import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';


export function help() {
  console.log('Up plugins.\n');
}

export default async function exec(files) {

  const paths = files.map(p => path.resolve(process.cwd(), p));
  if (!paths.length) {
    console.log(chalk.red('No file specified.'));
    return;
  }
  const definitions = (await Promise.all(paths.map( p => fs.readFile(p, 'utf8'))))
    .reduce( (p,i) => {
      return p.concat(JSON.parse(i, 'utf8'));
    }, []);

  const db = await connectDb();
  try {
    await db
      .collection('pluginDefinitions')
      .ensureIndex({ pluginId: 1 }, { unique: true });

    const validator = await createValidator();
    const models = await createModels(db, validator);
    const flushRes = await models.plugin.deleteMany({});
    console.log(`Deleted ${flushRes.result.n} plugin(s).`);
    const registerRes = await models.plugin.insertMany(definitions);
    console.log(`Insert ${registerRes.result.n} plugin(s).`);
  } catch(err) {
    console.error(err);
  } finally {
    await db.close();
  }
}
