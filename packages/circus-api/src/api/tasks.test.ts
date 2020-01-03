import { connectMongo } from '../../test/util-mongo';
import mongo from 'mongodb';
import { TaskExecutor } from './task';
import createModels, { Models } from '../db/createModels';
import createValidator from '../createValidator';

let db: mongo.Db, dbConnection: mongo.MongoClient, models: Models;

beforeAll(async () => {
  ({ db, dbConnection } = await connectMongo());
  const validator = await createValidator();
  models = createModels(db, validator);
});

afterAll(async () => {
  await dbConnection.close();
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
