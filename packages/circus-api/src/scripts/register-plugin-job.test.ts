import { setUpMongoFixture, usingSessionModels } from '../../test/util-mongo';
import { CommandFunc } from './Command';
import { Database, TransactionManager, Validator } from '../interface';
import { command } from './register-plugin-job';
import createTransactionManager from '../createTransactionManager';

const modelsPromise = usingSessionModels();
let commandFunc: CommandFunc;
let transactionManager: TransactionManager;
let database: Database;
let validator: Validator;
let cs: any;

beforeAll(async () => {
  database = (await modelsPromise).database;
  validator = (await modelsPromise).validator;
  transactionManager = await createTransactionManager(
    { maxCommitTimeMS: 10000 },
    { database, validator }
  );
});

beforeEach(async () => {
  const { db } = (await modelsPromise).database;
  const registerFn = jest.fn();
  cs = { job: { register: registerFn } };
  commandFunc = await command(null, { transactionManager, cs });
  await setUpMongoFixture(db, ['pluginJobs', 'users']);
});

test('create new plugin-job', async () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({
    _args: [
      'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6',
      '111.222.333.444.777'
    ],
    user: 'bob',
    priority: -1,
    tags: 'tag1,tag2'
  });
  expect(cs.job.register).toHaveBeenCalledTimes(1);
  expect(cs.job.register.mock.calls[0][0]).toHaveLength(26);
  expect(cs.job.register.mock.calls[0][1].pluginId).toEqual(
    'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6'
  );
  const jobId = spy.mock.calls[0][0];
  await transactionManager.withTransaction(async models => {
    const data = await models.pluginJob.findById(jobId);
    expect(data.pluginId).toBe(
      'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6'
    );
  });
  spy.mockReset();
});

describe('throw error when necessary arguments do not exist', () => {
  test('plugin ID is not entered', async () => {
    const command = commandFunc({
      _args: ['111.222.333.444.777'],
      user: 'bob'
    });
    await expect(command).rejects.toThrowError(
      new Error(
        'Required arguments must be specified.\n' +
          'argument 1: plugin ID or plugin name\n' +
          'argument 2: series UID'
      )
    );
  });

  test('nonexistent plugin ID', async () => {
    const command = commandFunc({
      _args: ['dummyPluginId', '111.222.333.444.777'],
      user: 'bob'
    });
    await expect(command).rejects.toThrow(
      new Error('Specified plugin does not exist.')
    );
  });

  test('user name is not entered.', async () => {
    const command = commandFunc({
      _args: [
        'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6',
        '111.222.333.444.777'
      ]
    });
    await expect(command).rejects.toThrowError(
      new Error('User ID or e-mail must be specified.')
    );
  });

  test('nonexistent user name', async () => {
    const command = commandFunc({
      _args: [
        'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6',
        '111.222.333.444.777'
      ],
      user: 'dammy'
    });
    await expect(command).rejects.toThrow(
      new Error('Specified user does not exist.')
    );
  });
});
