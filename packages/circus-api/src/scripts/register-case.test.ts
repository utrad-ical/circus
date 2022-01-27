import { setUpMongoFixture, usingSessionModels } from '../../test/util-mongo';
import { Database, TransactionManager, Validator } from '../interface';
import { CommandFunc } from './Command';
import { command } from './register-case';
import createTransactionManager from '../createTransactionManager';

const modelsPromise = usingSessionModels();
let commandFunc: CommandFunc;
let transactionManager: TransactionManager;
let database: Database;
let validator: Validator;

beforeAll(async () => {
  database = (await modelsPromise).database;
  validator = (await modelsPromise).validator;
  transactionManager = await createTransactionManager(
    { maxCommitTimeMS: 10000 },
    { database, validator }
  );
  commandFunc = await command(null, { transactionManager });
});

beforeEach(async () => {
  await setUpMongoFixture(database.db, [
    'clinicalCases',
    'users',
    'groups',
    'projects'
  ]);
});

test('create new case', async () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({
    _args: [
      '8883fdef6f5144f50eb2a83cd34baa44',
      '111.222.333.444.777',
      '111.222.333.444.888:1:10:1'
    ],
    user: 'bob',
    tags: 'tag1,tag2'
  });
  const caseId = spy.mock.calls[0][0];
  await transactionManager.withTransaction(async models => {
    const data = await models.clinicalCase.findById(caseId);
    expect(data.projectId).toBe('8883fdef6f5144f50eb2a83cd34baa44');
  });
  spy.mockReset();
});

describe('throw error when necessary arguments do not exist', () => {
  test('project ID is not entered', async () => {
    const command = commandFunc({
      _args: ['111.222.333.444.777'],
      user: 'bob'
    });
    await expect(command).rejects.toThrowError(
      new Error(
        'Required arguments must be specified.\n' +
          'argument 1: project ID or project name\n' +
          'argument 2: series UID'
      )
    );
  });

  test('nonexistent project ID', async () => {
    const command = commandFunc({
      _args: ['dummyProjectId', '111.222.333.444.777'],
      user: 'bob'
    });
    await expect(command).rejects.toThrow(
      new Error('Specified project does not exist.')
    );
  });

  test('user name is not entered.', async () => {
    const command = commandFunc({
      _args: ['8883fdef6f5144f50eb2a83cd34baa44', '111.222.333.444.777']
    });
    await expect(command).rejects.toThrowError(
      new Error('User ID or e-mail must be specified.')
    );
  });

  test('nonexistent user name', async () => {
    const command = commandFunc({
      _args: ['8883fdef6f5144f50eb2a83cd34baa44', '111.222.333.444.777'],
      user: 'dammy'
    });
    await expect(command).rejects.toThrow(
      new Error('Specified user does not exist.')
    );
  });
});
