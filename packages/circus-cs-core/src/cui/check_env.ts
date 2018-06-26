import * as ajv from 'ajv';
import * as fs from 'fs-extra';
import { MongoClient } from 'mongodb';
import isDirectory from '../util/isDirectory';
import config from '../config';
const argumentsSchema = {
  type: 'object'
};

export default async function check_env(argv: any) {
  const argCheck = new ajv().compile(argumentsSchema)(argv);

  if (!argCheck) {
    console.error('Argument is something wrong.');
    process.exit(1);
  }

  try {
    await checkTemporaryDirBase();
    await checkDocker();
    await checkMongo('config.queue.mongoURL', config.queue.mongoURL);
    // await checkMongo('config.webUI.mongoURL', config.webUI.mongoURL);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  console.log('OK');
}

async function checkTemporaryDirBase() {
  const { temporaryDirBase } = config;

  try {
    // Create directory
    if (!(await isDirectory(temporaryDirBase)))
      throw new Error(
        `config.temporaryDirBase: ${temporaryDirBase} does not exist.`
      );

    await fs.mkdir(`${temporaryDirBase}/test`);
    await fs.remove(`${temporaryDirBase}/test`);
  } catch (e) {
    throw new Error(
      `config.temporaryDirBase: ${temporaryDirBase} is something wrong.  (ex) not exists, no permission to write, ...etc`
    );
  }
}

async function checkDocker() {
  const { docker = {} } = config;
  const dockerSocketPath =
    docker.socketPath || process.env.DOCKER_SOCKET || '/var/run/docker.sock';

  if (!fs.statSync(dockerSocketPath).isSocket())
    throw new Error('Are you sure the docker is running?');

  config.docker = docker;
}

async function checkMongo(title: string, url: string) {
  try {
    if (!url) throw new Error('empty');

    const connection: MongoClient | null = await MongoClient.connect(url);
    if (connection) {
      await connection.close();
    } else {
      throw new Error('Cannot connect to mongodb');
    }
  } catch (e) {
    throw new Error(`${title} is something wrong.`);
  }
}
