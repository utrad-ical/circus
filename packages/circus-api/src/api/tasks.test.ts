import { usingMongo } from '../../test/util-mongo';
import createValidator from '../createValidator';
import createModels, { Models } from '../db/createModels';
import { TaskExecutor } from './task';

let models: Models;

const dbPromise = usingMongo();

beforeAll(async () => {
  const db = await dbPromise;
  const validator = await createValidator(undefined);
  models = await createModels(undefined, { db, validator });
});

describe('TaskExecutor', () => {
  it('should create task and save its progress', async () => {
    const task = new TaskExecutor('alice@example.com', {
      models,
      command: 'long command'
    });
    const taskId = await task.saveNew();

    await task.progress('executing', 50, 100);
    const t1 = await models.task.findByIdOrFail(taskId);
    expect(t1.status).toBe('running');
    expect(t1.value).toBe(50);

    await task.finish();
    const t2 = await models.task.findByIdOrFail(taskId);
    expect(t2.status).toBe('finished');
  });
});
