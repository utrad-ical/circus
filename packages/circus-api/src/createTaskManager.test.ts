import createTaskManager, {
  TaskEventEmitter,
  TaskManager
} from './createTaskManager';
import { Models } from './interface';
import { setUpMongoFixture, usingModels } from '../test/util-mongo';
import { readFromStream, readFromStreamTillEnd } from '../test/util-stream';
import path from 'path';
import fs from 'fs-extra';
import createNullLogger from '@utrad-ical/circus-lib/src/logger/NullLogger';

const modelsPromise = usingModels();
let models: Models;
let manager: TaskManager;
const userEmail = 'alice@example.com';
const downloadTestDir = path.join(__dirname, '../test/download-test');

beforeAll(async () => {
  await fs.mkdir(downloadTestDir);
  const { db, models: m } = await modelsPromise;
  await setUpMongoFixture(db, ['tasks']);
  models = m;
});

beforeEach(async () => {
  manager = await createTaskManager(
    { downloadFileDirectory: downloadTestDir, timeoutMs: 10000 },
    { models, apiLogger: await createNullLogger(null, {}) }
  );
});

afterAll(async () => {
  await fs.remove(downloadTestDir);
});

const newDummyCtx = () => ({ body: null } as any);

describe('register', () => {
  test('without download file', async () => {
    const ctx = newDummyCtx();
    const { taskId, emitter } = await manager.register(ctx, {
      name: 'Importing DICOM files',
      userEmail
    });
    expect(ctx.body).toEqual({ taskId });

    const task = await models.task.findById(taskId);
    expect(task.name).toBe('Importing DICOM files');
    expect(task.status).toBe('processing');
    expect(task.userEmail).toBe('alice@example.com');
    expect(emitter.eventNames()).toEqual(['progress', 'error', 'finish']);
  });

  test('with download file', async () => {
    const ctx = newDummyCtx();
    const { taskId, emitter, downloadFileStream } = await manager.register(
      ctx,
      {
        name: 'Exporting case',
        userEmail,
        downloadFileType: 'application/zip'
      }
    );
    const fileContent = Math.random().toString();

    downloadFileStream!.end(fileContent);
    expect(ctx.body).toEqual({ taskId });
    emitter.emit('finish', 'Export finished.');

    const task = await models.task.findById(taskId);
    expect(task.downloadFileType).toMatch(/application\/zip/);
    expect(await fs.readFile(path.join(downloadTestDir, taskId), 'utf8')).toBe(
      fileContent
    );
  });
});

describe('report', () => {
  let taskId: string;
  let emitter: TaskEventEmitter;

  beforeEach(async () => {
    ({ taskId, emitter } = await manager.register(newDummyCtx(), {
      name: 'Importing DICOM files',
      userEmail
    }));
  });

  test('report progress of one task', async () => {
    const ctx = newDummyCtx();
    manager.report(ctx, userEmail);

    const readStream = ctx.body;
    const streamFinish = readFromStream(readStream);

    emitter.emit('progress', 'Importing 10 files...', 1, 10);
    emitter.emit('finish', 'Imported.');

    const sentData = await streamFinish();
    expect(sentData).toMatch(/progress/);
    expect(sentData).toMatch(/finish/);
    expect(sentData).toMatch(/taskId/);

    const finishedTask = await models.task.findById(taskId);
    expect(finishedTask.status).toBe('finished');
  });

  test("report only the given user's progress", async () => {
    const userEmail2 = 'bob@example.com';
    const { taskId: taskIdBob, emitter: emitterBob } = await manager.register(
      newDummyCtx(),
      {
        name: 'Importing DICOM files',
        userEmail: userEmail2
      }
    );

    const ctx = newDummyCtx();
    manager.report(ctx, userEmail2);

    const readStream = ctx.body;
    const streamFinish = readFromStream(readStream);

    emitter.emit('progress', 'Importing 10 files...', 1, 10);
    emitter.emit('finish');

    emitterBob.emit('progress', 'Importing 10 files...', 1, 10);
    emitterBob.emit('finish');

    const sentData = await streamFinish();
    expect(sentData).not.toMatch(taskId); // no Alice's task
    expect(sentData).toMatch(new RegExp(`finish\n.+${taskIdBob}`));
  });

  test('report error of one task', async () => {
    const ctx = newDummyCtx();
    manager.report(ctx, userEmail);
    const readStream = ctx.body;
    const streamFinish = readFromStream(readStream);

    emitter.emit('error', 'Some error happened.');

    const sentData = await streamFinish();
    expect(sentData).toMatch(/error/);

    const task = await models.task.findById(taskId);
    expect(task.status).toBe('error');
  });
});

test('isTaskInProgress', async () => {
  expect(manager.isTaskInProgress('dummy')).toBe(false);

  const ctx = newDummyCtx();
  const { taskId, emitter } = await manager.register(ctx, {
    name: 'Importing DICOM files',
    userEmail
  });

  expect(manager.isTaskInProgress(taskId)).toBe(true);

  emitter.emit('progress', 'Importing 10 files...', 1, 10);
  expect(manager.isTaskInProgress(taskId)).toBe(true);

  emitter.emit('finish');
  expect(manager.isTaskInProgress(taskId)).toBe(false);
});

test('download', async () => {
  const ctx = newDummyCtx();
  const taskId = 'aaaabbbbcccc2222';
  await fs.writeFile(path.join(downloadTestDir, taskId), 'test');
  await manager.download(ctx, taskId);
  expect(ctx.type).toBe('application/zip');
  const string = await readFromStreamTillEnd(ctx.body);
  expect(string).toBe('test');
});
