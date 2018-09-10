import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { MongoClient } from 'mongodb';
import DockerRunner from '../util/DockerRunner';
import isDirectory from '../util/isDirectory';
import config from '../config';

export default async function checkEnv(argv: any) {
  const check = async (title: string, func: Function) => {
    try {
      process.stdout.write((title + ' '.repeat(30)).substr(0, 30) + ': ');
      await func();
      process.stdout.write(chalk.cyanBright('[OK]\n'));
    } catch (e) {
      process.stdout.write(chalk.redBright('[NG]\n'));
      console.error('  ' + e.message);
    }
  };

  await check('Plugin working directory', checkpluginWorkingDir);
  await check('Docker connection', checkDocker);
  await check('MongoDB connection', checkMongo);
}

async function checkpluginWorkingDir() {
  const { pluginWorkingDir } = config;
  await fs.ensureDir(pluginWorkingDir);
  const tmpDir = path.join(pluginWorkingDir, 'env-check-test');
  await fs.remove(tmpDir);
  await fs.ensureDir(tmpDir);
  if (!(await isDirectory(tmpDir)))
    throw new Error('Failed to create job temporary directory.');
}

async function checkDocker() {
  const dr = new DockerRunner();
  const out = await dr.run({ Image: 'hello-world' });
  if (!/Hello from Docker/.test(out))
    throw new Error('Docker did not respond correctly.');
}

async function checkMongo() {
  const url = config.queue.mongoUrl;
  const connection = await MongoClient.connect(url);
  if (connection) {
    await connection.close();
  } else {
    throw new Error('Cannot connect to mongodb');
  }
}
