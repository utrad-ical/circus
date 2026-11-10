import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, mock } from 'node:test';
import type { TaskEventEmitter, TaskManager } from './createTaskManager.ts';
import createTaskManager from './createTaskManager.ts';
import type { Models } from './interface.ts';
import { setUpMongoFixture, usingModels } from './test/util-mongo.ts';
import { readFromStream, readFromStreamTillEnd } from './test/util-stream.ts';
import path from 'path';
import fs from 'fs-extra';
import { createNullLogger } from '@utrad-ical/circus-lib';

const modelsPromise = usingModels();
let models: Models;
let manager: TaskManager;
const userEmail = 'alice@example.com';
const downloadTestDir = path.join(__dirname, '../test/download-test');

before(async () => {
  await fs.mkdir(downloadTestDir);
  const { database, models: m } = await modelsPromise;
  const { db } = database;
  await setUpMongoFixture(db, ['tasks']);
  models = m;
});

beforeEach(async () => {
  manager = await createTaskManager(
    { downloadFileDirectory: downloadTestDir, timeoutMs: 10000 },
    { models, apiLogger: await createNullLogger(null, {}) }
  );
});

after(async () => {
  await fs.remove(downloadTestDir);
});

const waitForTaskStatus = async (taskId: string, status: string) => {
  for (let i = 0; i < 100; i++) {
    const task = await models.task.findById(taskId);
    if (task.status === status) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Task ${taskId} did not become ${status}`);
};

const newDummyCtx = () =>
  ({
    body: null,
    set: mock.fn(),
    throw: (status: number, message?: string) => {
      const error = new Error(message ?? `status ${status}`);
      error.status = status;
      error.expose = true;
      throw error;
    }
  }) as any;

describe('register', () => {
  test('without download file', async () => {
    const ctx = newDummyCtx();
    const { taskId, emitter } = await manager.register(ctx, {
      name: 'Importing DICOM files',
      userEmail
    });
    assert.deepEqual(ctx.body, { taskId });

    const task = await models.task.findById(taskId);
    assert.equal(task.name, 'Importing DICOM files');
    assert.equal(task.status, 'processing');
    assert.equal(task.userEmail, 'alice@example.com');
    assert.deepEqual(emitter.eventNames(), ['progress', 'error', 'finish']);
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
    assert.deepEqual(ctx.body, { taskId });
    emitter.emit('finish', 'Export finished.');

    const task = await models.task.findById(taskId);
    assert.match(task.downloadFileType, /application\/zip/);
    assert.equal(
      await fs.readFile(path.join(downloadTestDir, taskId), 'utf8'),
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
    assert.match(sentData, /progress/);
    assert.match(sentData, /finish/);
    assert.match(sentData, /taskId/);

    const finishedTask = await models.task.findById(taskId);
    assert.equal(finishedTask.status, 'finished');
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
    assert.ok(!sentData.includes(taskId)); // no Alice's task
    assert.match(sentData, new RegExp(`finish\n.+${taskIdBob}`));
  });

  test('report error of one task', async () => {
    const ctx = newDummyCtx();
    manager.report(ctx, userEmail);
    const readStream = ctx.body;
    const streamFinish = readFromStream(readStream);

    emitter.emit('error', 'Some error happened.');

    const sentData = await streamFinish();
    assert.match(sentData, /error/);

    const task = await models.task.findById(taskId);
    assert.equal(task.status, 'error');
  });
});

test('isTaskInProgress', async () => {
  assert.equal(manager.isTaskInProgress('dummy'), false);

  const ctx = newDummyCtx();
  const { taskId, emitter } = await manager.register(ctx, {
    name: 'Importing DICOM files',
    userEmail
  });

  assert.equal(manager.isTaskInProgress(taskId), true);

  emitter.emit('progress', 'Importing 10 files...', 1, 10);
  assert.equal(manager.isTaskInProgress(taskId), true);

  emitter.emit('finish');
  assert.equal(manager.isTaskInProgress(taskId), false);

  // Wait for the DB update triggered by 'finish' so that it does not
  // outlive the DB connection closed in afterAll
  await waitForTaskStatus(taskId, 'finished');
});

test('download', async () => {
  const ctx = newDummyCtx();
  const taskId = 'aaaabbbbcccc2222';
  await fs.writeFile(path.join(downloadTestDir, taskId), 'test');
  await manager.download(ctx, taskId);
  assert.equal(ctx.type, 'application/zip');
  assert.ok(ctx.set.mock.callCount() > 0);
  const string = await readFromStreamTillEnd(ctx.body);
  assert.equal(string, 'test');
});

test('fail download when the download file is gone', async () => {
  const ctx = newDummyCtx();
  const taskId = 'aaaabbbbcccc4444';
  try {
    await manager.download(ctx, taskId);
  } catch (err: any) {
    assert.equal(err.status, 404);
  }
});
