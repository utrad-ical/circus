import * as yaml from "js-yaml";
import * as fs from "fs";
// import * as Dockerode from 'dockerode';
import { MongoClient } from "mongodb";
import { isDir, mkDir, rmDir } from "./directory";

const config = require("../config/default");
config.plugins = parsePluginConfig(config.pluginConfigPath);

export async function checkTemporaryDirBase() {
  const { temporaryDirBase } = config;

  try {
    // Create directory
    if (!await isDir(temporaryDirBase))
      throw new Error(
        `config.temporaryDirBase: ${temporaryDirBase} is not exists.`
      );

    await mkDir(`${temporaryDirBase}/test`);
    await rmDir(`${temporaryDirBase}/test`);
  } catch (e) {
    throw new Error(
      `config.temporaryDirBase: ${temporaryDirBase} is something wrong.  (ex) not exists, no permission to write, ...etc`
    );
  }
}

export async function checkDocker() {
  const { docker = {} } = config;
  const dockerSocketPath =
    docker.socketPath || process.env.DOCKER_SOCKET || "/var/run/docker.sock";

  if (!fs.statSync(dockerSocketPath).isSocket())
    throw new Error("Are you sure the docker is running?");

  config.docker = docker;
}

export async function checkMongo(title: string, url: string) {
  try {
    if (!url) throw new Error("empty");

    const connection: MongoClient | null = await MongoClient.connect(url);
    if (connection) {
      await connection.close();
    } else {
      throw new Error("Cannot connect to mongodb");
    }
  } catch (e) {
    throw new Error(`${title} is something wrong.`);
  }
}

function parsePluginConfig(pluginConfigPath: string) {
  const pluginConfigContent = yaml.safeLoad(
    fs.readFileSync(pluginConfigPath, "utf8")
  );
  const pluginConfig: any = {};
  if (typeof pluginConfigContent !== "undefined")
    [].forEach.call(pluginConfigContent, (p: any) => {
      pluginConfig[p.pluginName] = p;
    });
  return pluginConfig;
}

export async function setupCoreMongo(): Promise<void> {
  const client: MongoClient = await MongoClient.connect(config.mongoURL);

  const db = client.db();
  try {
    await db.createCollection("pluginJobQueue");
    await db
      .collection("pluginJobQueue")
      .createIndex({ jobId: 1 }, { unique: true });
    await client.close();
  } catch (e) {
    console.error(e);
  }
}

// Based on circus-rs\src\server\ModuleLoader.ts
export function detectDicomeFileRepository() {
  const descriptor: { module: string; options: any } =
    config.dicomFileRepository;

  let loadPath: string;
  if (/\//.test(descriptor.module)) {
    // Load external module if module path is explicitly set
    loadPath = descriptor.module;
  } else {
    // Load built-in modules
    loadPath = "./dicom-file-repository/" + descriptor.module;
  }
  let repositoryClass = require(loadPath).default;
  return new repositoryClass(descriptor.options || {});
}

export default config;
