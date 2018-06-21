import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { PluginJobRequest } from '../interface';
import { isDir, mkDir, rmDir } from '../util/directory';
import DicomFileRepository from '../dicom-file-repository/DicomFileRepository';
import detectDicomeFileRepository from '../dicom-file-repository/detect';
import * as QueueSystem from '../queue/queue';
import {
  default as DockerRunner,
  DockerRunnerTimeout
} from '../util/docker-runner';
import config from '../config';

const hook = require('../web-ui-hooks');

const logging = (
  content: string,
  queueItem: QueueSystem.Item<PluginJobRequest> | null = null
) => {
  console.log('    - ' + (queueItem ? queueItem._id : '') + ': ' + content);
};

export default async function processNextJob(): Promise<boolean | null> {
  //  Get next item from queue.
  const queueItem: QueueSystem.Item<
    PluginJobRequest
  > | null = await QueueSystem.dequeue();

  if (queueItem === null) return null;
  logging('Dequeued', queueItem);

  return processJob(queueItem);
}

export async function processJob(
  queueItem: QueueSystem.Item<PluginJobRequest>
): Promise<boolean> {
  try {
    // 1. Mark queue item as "processing".
    logging('Mark queue item as "processing".', queueItem);
    await QueueSystem.processing(queueItem);

    // 2. Notice status "processing" to webUI system via hook.
    logging('Notice status "processing" to webUI system via hook.', queueItem);
    if (hook.proccessing) await hook.proccessing(queueItem.jobId);

    // 3. Create some temporary directories.
    logging('Create some temporary directories.', queueItem);
    var {
      tmpBaseDir,
      tmpDicomDir,
      tmpPluginInputDir,
      tmpPluginOutputDir
    } = await createTemporaryDirectories(queueItem.jobId);
  } catch (e) {
    logging('Error: ' + e.message, queueItem);
    // E. Mark queue item as "error".
    await QueueSystem.error(queueItem);
    return false;
  }

  try {
    //  4. Fetch DICOM data from repository into local temporary area.
    logging(
      'Fetch DICOM data from repository into local temporary area.',
      queueItem
    );
    const payload: PluginJobRequest = queueItem.payload;
    const { series } = payload;
    const fetches: Promise<any>[] = [];
    for (let i = 0; i < series.length; i++) {
      fetches.push(fetchDICOMData(series[i].seriesUid, tmpDicomDir, i));
    }
    await Promise.all(fetches);

    //  5. Parse the DICOM data to raw volume file and a few meta files.
    logging(
      'Parse the DICOM data to raw volume file and a few meta files.',
      queueItem
    );
    await parseDICOMData(tmpDicomDir, tmpPluginInputDir);

    //  6. Execute plugin process.
    //  And observing to handle timeout, other unexpected errors.
    logging('Execute plugin process.', queueItem);
    try {
      var pluginStdout = await executePlugin(
        payload.pluginId,
        tmpPluginInputDir,
        tmpPluginOutputDir
      );
    } catch (e) {
      //  Handle timeout, other unexpected errors.
      if (e instanceof DockerRunnerTimeout) {
        if (hook.timeout) await hook.timeout(queueItem.jobId);
      } else {
        if (hook.failed)
          await hook.failed(
            queueItem.jobId,
            e.message,
            tmpPluginInputDir,
            tmpPluginOutputDir
          );
      }
      throw e;
    }

    // 7. Validate the result.
    logging('Validate the result.', queueItem);
    try {
      validatePluginExecutionResult(
        queueItem.jobId,
        pluginStdout,
        tmpPluginInputDir,
        tmpPluginOutputDir
      );
    } catch (e) {
      if (hook.invalidated)
        await hook.invalidated(
          queueItem.jobId,
          pluginStdout,
          tmpPluginInputDir,
          tmpPluginOutputDir,
          e
        );
      throw e;
    }

    // 8. Process the result.
    logging('Process the result.', queueItem);
    // Notice status "finished" to webUI system and register some result at the same time.
    // Other results (like output files) put to ... ?
    if (hook.finished)
      await hook.finished(
        queueItem.jobId,
        pluginStdout,
        tmpPluginInputDir,
        tmpPluginOutputDir
      );

    // 9. Mark queue item as "done".
    logging('Mark queue item as "done".', queueItem);
    await QueueSystem.done(queueItem);
    return true;
  } catch (e) {
    logging('Error: ' + e.message, queueItem);
    // E. Mark queue item as "error".
    await QueueSystem.error(queueItem);
    return false;
  } finally {
    // 10. Clean up temporary directories.
    logging('Clean up temporary directories.', queueItem);
    await rmDir(tmpBaseDir);
  }
}

export async function createTemporaryDirectories(
  jobId: string
): Promise<{
  tmpBaseDir: string;
  tmpDicomDir: string;
  tmpPluginInputDir: string;
  tmpPluginOutputDir: string;
}> {
  const directoryName = (_ => {
    return createHash('md5')
      .update(_)
      .digest('hex');
  })(jobId);
  const tmpBaseDir = path.join(config.temporaryDirBase, directoryName);
  const tmpDicomDir = path.join(config.temporaryDirBase, directoryName, 'dcm');
  const tmpPluginInputDir = path.join(
    config.temporaryDirBase,
    directoryName,
    'in'
  );
  const tmpPluginOutputDir = path.join(
    config.temporaryDirBase,
    directoryName,
    'out'
  );

  await mkDir(tmpBaseDir);
  await Promise.all([
    mkDir(tmpDicomDir),
    mkDir(tmpPluginInputDir),
    mkDir(tmpPluginOutputDir)
  ]);

  return { tmpBaseDir, tmpDicomDir, tmpPluginInputDir, tmpPluginOutputDir };
}

export async function fetchDICOMData(
  seriesUid: string,
  storeDir: string,
  index: number
): Promise<void> {
  // Todo: supports multiple serieses.
  if (index !== 0) return Promise.resolve();

  const repository: DicomFileRepository = detectDicomeFileRepository(
    config.dicomFileRepository
  );

  if (!(await isDir(storeDir)))
    throw new Error(`Dicrectory: ${storeDir} is not exists.`);

  const { seriesLoader, count } = await repository.getSeriesLoader(seriesUid);

  const save = (num: number) => {
    const filename = ('00000000' + num.toString()).slice(-8);
    return new Promise((resolve, reject) => {
      seriesLoader(num).then((buffer: ArrayBuffer) =>
        fs.writeFile(`${storeDir}/${filename}.dcm`, new Buffer(buffer), err => {
          if (err) reject(err);
          resolve();
        })
      );
    });
  };

  const promiseCollection = [];
  for (let i = 1; i <= count; i++) promiseCollection.push(save(i));

  return Promise.all(promiseCollection).then(() => {});
}

export async function parseDICOMData(
  srcDir: string,
  destDir: string
): Promise<[number, number, number]> {
  const { socketPath } = config.docker;

  if (!(await isDir(srcDir)))
    throw new Error(`Dicrectory: ${srcDir} is not exists.`);

  if (!(await isDir(destDir)))
    throw new Error(`Dicrectory: ${destDir} is not exists.`);

  const { dockerImage, volumeIn, volumeOut } = config.dicomDumpOptions;

  const runner = new DockerRunner({
    socketPath,
    timeout: 3600 * 1000 // Force timeout?
  });

  const result = await runner.run({
    Image: dockerImage,
    HostConfig: {
      Binds: [`${srcDir}:${volumeIn}`, `${destDir}:${volumeOut}`],
      AutoRemove: false
    }
  });

  if (!result.match(/Export\s+result:(\d+),(\d+),(\d+)\s+Succeeded/))
    throw new Error(result);

  return [Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3)];
}

export async function executePlugin(
  pluginId: string,
  srcDir: string,
  destDir: string
): Promise<string> {
  const { socketPath } = config.docker;
  const pluginConfig = config.plugins;

  if (!(pluginId in pluginConfig))
    throw new Error(`Plugin: ${pluginId} is not defined.`);

  if (!(await isDir(srcDir)))
    throw new Error(`Dicrectory: ${srcDir} is not exists.`);

  if (!(await isDir(destDir)))
    throw new Error(`Dicrectory: ${destDir} is not exists.`);

  const {
    dockerImage,
    binds = {
      in: '/circus/in',
      out: '/circus/out'
    },
    maxExecutionSeconds = 360
  } = pluginConfig[pluginId];

  const runner = new DockerRunner({
    socketPath,
    timeout: 3 * 60 * 60 * 1000
  });

  if (maxExecutionSeconds) runner.setTimeout(maxExecutionSeconds * 1000);

  const result = await runner.run({
    Image: dockerImage,
    HostConfig: {
      Binds: [`${srcDir}:${binds.in}`, `${destDir}:${binds.out}`],
      AutoRemove: false
    }
  });

  return result;
}

export async function validatePluginExecutionResult(
  jobId: string,
  result: string,
  tmpPluginInputDir: string,
  tmpPluginOutputDir: string
): Promise<void> {}
