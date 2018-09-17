import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { MongoClient } from 'mongodb';
import DockerRunner from '../util/DockerRunner';
import isDirectory from '../util/isDirectory';
import { Configuration } from '../config';

export default async function checkEnv(config: Configuration, argv: any) {
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

  const entries = checks(config);
  await check('Plugin working directory', entries.pluginWorkingDir);
  await check('Docker connection', entries.docker);
  await check('MongoDB connection', entries.mongo);
}

function checks(config: Configuration) {
  const pWorkingDir = config.pluginWorkingDir;
  const url = config.queue.mongoUrl;

  async function pluginWorkingDir() {
    await fs.ensureDir(pWorkingDir);
    const tmpDir = path.join(pWorkingDir, 'env-check-test');
    await fs.remove(tmpDir);
    await fs.ensureDir(tmpDir);
    if (!(await isDirectory(tmpDir)))
      throw new Error('Failed to create job temporary directory.');
  }

  async function docker() {
    const dr = new DockerRunner();
    const out = await dr.run({ Image: 'hello-world' });
    if (!/Hello from Docker/.test(out))
      throw new Error('Docker did not respond correctly.');
  }

  async function mongo() {
    const connection = await MongoClient.connect(url);
    if (connection) {
      await connection.close();
    } else {
      throw new Error('Cannot connect to mongodb');
    }
  }

  return { pluginWorkingDir, docker, mongo };
}
