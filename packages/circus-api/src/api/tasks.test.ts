import { usingModels } from '../../test/util-mongo';
import { Models } from '../db/createModels';
import { TaskExecutor } from './task';

let models: Models;

const modelsPromise = usingModels();

beforeAll(async () => {
  models = (await modelsPromise).models;
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
