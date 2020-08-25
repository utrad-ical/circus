import createTaskManager from './createTaskManager';
import { Models } from './interface';
import { setUpMongoFixture, usingModels } from '../test/util-mongo';

const modelsPromise = usingModels();
let models: Models;

beforeAll(async () => {
  const { db, models: m } = await modelsPromise;
  await setUpMongoFixture(db, ['tasks']);
  models = m;
});

test('taskManager', async () => {
  const manager = await createTaskManager({}, { models });
  const ctx = { body: null } as any;
  const { taskId, emitter } = await manager.register(ctx, {
    name: 'Importing DICOM files',
    userEmail: 'alice@example.com'
  });
  expect(ctx.body).toEqual({ taskId });
});
