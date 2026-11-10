import assert from 'node:assert/strict';
import { describe, test, before, beforeEach, mock } from 'node:test';
import { setUpMongoFixture, usingSessionModels } from '../test/util-mongo.ts';
import type { CommandFunc } from './Command.ts';
import type { Database, TransactionManager, Validator } from '../interface.ts';
import { command } from './register-plugin-job.ts';
import createTransactionManager from '../createTransactionManager.ts';

const modelsPromise = usingSessionModels();
let commandFunc: CommandFunc;
let transactionManager: TransactionManager;
let database: Database;
let validator: Validator;
let cs: any;

before(async () => {
  database = (await modelsPromise).database;
  validator = (await modelsPromise).validator;
  transactionManager = await createTransactionManager(
    { maxCommitTimeMS: 10000 },
    { database, validator }
  );
});

beforeEach(async () => {
  const { db } = (await modelsPromise).database;
  const registerFn = mock.fn();
  cs = { job: { register: registerFn } };
  commandFunc = await command(null, { transactionManager, cs });
  await setUpMongoFixture(db, ['pluginJobs', 'users']);
});

test('create new plugin-job', async () => {
  const spy = mock.method(console, 'log', () => {});
  await commandFunc({
    _args: [
      'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6',
      '111.222.333.444.777'
    ],
    user: 'bob',
    priority: -1,
    tags: 'tag1,tag2'
  });
  assert.equal(cs.job.register.mock.callCount(), 1);
  assert.equal(cs.job.register.mock.calls[0].arguments[0].length, 26);
  assert.deepEqual(
    cs.job.register.mock.calls[0].arguments[1].pluginId,
    'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6'
  );
  const jobId = spy.mock.calls[0].arguments[0];
  await transactionManager.withTransaction(async models => {
    const data = await models.pluginJob.findById(jobId);
    assert.equal(
      data.pluginId,
      'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6'
    );
  });
  spy.mock.resetCalls();
});

describe('throw error when necessary arguments do not exist', () => {
  test('plugin ID is not entered', async () => {
    const command = commandFunc({
      _args: ['111.222.333.444.777'],
      user: 'bob'
    });
    await assert.rejects(command, {
      message:
        'Required arguments must be specified.\n' +
        'argument 1: plugin ID or plugin name\n' +
        'argument 2: series UID'
    });
  });

  test('nonexistent plugin ID', async () => {
    const command = commandFunc({
      _args: ['dummyPluginId', '111.222.333.444.777'],
      user: 'bob'
    });
    await assert.rejects(command, {
      message: 'Specified plugin does not exist.'
    });
  });

  test('user name is not entered.', async () => {
    const command = commandFunc({
      _args: [
        'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6',
        '111.222.333.444.777'
      ]
    });
    await assert.rejects(command, {
      message: 'User ID or e-mail must be specified.'
    });
  });

  test('nonexistent user name', async () => {
    const command = commandFunc({
      _args: [
        'e2cf1a5f82d62f7b3bd02db78e51008f4f11f8b31aedc96bfd50f3d7c80ba6e6',
        '111.222.333.444.777'
      ],
      user: 'dammy'
    });
    await assert.rejects(command, {
      message: 'Specified user does not exist.'
    });
  });
});
