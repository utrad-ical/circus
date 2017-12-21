import * as test from './test-utils';
import { assert } from 'chai';
import { TaskExecutor } from '../src/api/task';
import createModels from '../src/db/createModels';
import createValidator from '../src/createValidator';

describe('tasks', function() {
  let db, models;

  before(async function() {
    db = await test.connectMongo();
    const validator = await createValidator();
    models = createModels(db, validator);
  });

  after(async function() {
    await db.close();
  });

  describe('TaskExecutor', function() {
    it('should create task and save its progress', async function() {
      const task = new TaskExecutor('alice@example.com', { models });
      const taskId = await task.saveNew();

      await task.progress('executing', 50, 100);
      const t1 = await models.task.findByIdOrFail(taskId);
      assert.equal(t1.status, 'running');
      assert.equal(t1.value, 50);

      await task.finish();
      const t2 = await models.task.findByIdOrFail(taskId);
      assert.equal(t2.status, 'finished');
    });
  });
});
