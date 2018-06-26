import { MongoClient } from 'mongodb';

import config from './config';
import * as path from 'path';
import * as fs from 'fs-extra';

const { mongoURL, collectionTitle, resultDir } = config.WebUI;

export async function inQueue(jobId: string): Promise<void> {
  console.log('Notice inQueue');
}

export async function proccessing(jobId: string): Promise<void> {
  console.log('Notice proccessing');
}

export async function timeout(jobId: string): Promise<void> {
  console.log('Notice timeout');
}

export async function failed(
  jobId: string,
  result: string,
  tmpPluginInputDir: string,
  tmpPluginOutputDir: string
): Promise<void> {
  console.log('Notice failed');
}

export async function invalidated(
  jobId: string,
  result: string,
  tmpPluginInputDir: string,
  tmpPluginOutputDir: string,
  e: any
): Promise<void> {
  console.log('Notice invalidated');
}

export async function finished(
  jobId: string,
  result: string,
  tmpPluginInputDir: string,
  tmpPluginOutputDir: string
): Promise<void> {
  const baseDir = path.join(resultDir, jobId);
  console.log('Notice finished #' + jobId);
  console.log('  >> result: ' + baseDir);

  try {
    await fs.mkdirs(baseDir);
    await fs.copy(path.join(tmpPluginOutputDir, '..'), baseDir);
    await fs.writeFile(path.join(baseDir, 'stdout.txt'), result);
  } catch (e) {
    console.error('  >> error: ' + e.message);
  }
}

export async function cancelled(jobId: string): Promise<void> {
  console.log('Notice cancelled');
}

/**
 * MongoDb
 */
async function update(jobId: string, $set: any): Promise<void> {
  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  try {
    const { value, lastErrorObject, ok } = await connection
      .db()
      .collection(collectionTitle)
      .findOneAndUpdate({ jobId }, { $set });

    if (value === null)
      throw new Error('Corresponded document does not exist.');

    return value; // before update value.
  } catch (e) {
    throw e;
  } finally {
    await connection.close();
  }
}
