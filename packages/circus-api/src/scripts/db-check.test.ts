import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import type * as mongo from 'mongodb';
import { setUpMongoFixture, usingModels } from '../test/util-mongo.ts';
import type { CommandFunc } from './Command.ts';
import { command } from './db-check.ts';

const modelsPromise = usingModels();
let commandFunc: CommandFunc;
let db: mongo.Db;

beforeEach(async () => {
  const { database, models } = await modelsPromise;
  db = database.db;
  await setUpMongoFixture(db, ['users', 'groups']);
  commandFunc = await command(null, { models });
});

afterEach(() => {
  process.exitCode = undefined;
  mock.restoreAll();
});

const run = async () => {
  const output: string[] = [];
  const capture = (...args: unknown[]) => output.push(args.join(' '));
  mock.method(console, 'log', capture);
  mock.method(console, 'error', capture);
  await commandFunc({ target: ['user', 'group'] });
  return output.join('\n');
};

test('passes valid data', async () => {
  const output = await run();
  assert.equal(process.exitCode, undefined);
  assert.doesNotMatch(output, /error/i);
});

test('reports every invalid document and exits with 1', async () => {
  // Inserted directly to bypass the validation on writes
  const user = await db
    .collection('users')
    .findOne({}, { projection: { _id: 0 } });
  await db.collection('users').insertOne({
    ...user,
    userEmail: 'broken@example.com',
    loginId: 'broken',
    unknownField: 1 // rejected in the strict check
  });
  const group = await db
    .collection('groups')
    .findOne({}, { projection: { _id: 0 } });
  await db
    .collection('groups')
    .insertOne({ ...group, groupId: 99, groupName: 42 });

  const output = await run();
  assert.equal(process.exitCode, 1);
  // Both collections are checked even after the first error
  assert.match(output, /\/ Unrecognized key/);
  assert.match(output, /\/groupName /);
  assert.match(output, /Found 2 invalid item\(s\)/);
});
