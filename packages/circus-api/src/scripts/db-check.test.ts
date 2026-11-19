import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import type * as mongo from 'mongodb';
import { adminCliMongoConfig, runAdminCli } from '../test/util-admin-cli.ts';
import { setUpMongoFixture, usingModels } from '../test/util-mongo.ts';
import { command } from './db-check.ts';

const modelsPromise = usingModels();
let commandFunc: Awaited<ReturnType<typeof command>>;
let db: mongo.Db;

beforeEach(async () => {
  const { database, models } = await modelsPromise;
  db = database.db;
  await setUpMongoFixture(db, ['users', 'groups', 'projects', 'clinicalCases']);
  commandFunc = await command(null, { models });
});

afterEach(() => {
  process.exitCode = undefined;
  mock.restoreAll();
});

const run = async (
  target = ['user', 'group'],
  options: Parameters<typeof commandFunc>[0] = {}
) => {
  const output: string[] = [];
  const capture = (...args: unknown[]) => output.push(args.join(' '));
  mock.method(console, 'log', capture);
  mock.method(console, 'error', capture);
  await commandFunc({ target, ...options });
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
  assert.match(output, /unknownField: Unrecognized key/);
  assert.match(output, /groupName: Invalid input/);
  assert.match(output, /Found 2 invalid item\(s\)/);
});

test('warns about attributes against the project schemas', async () => {
  await db.collection('projects').updateOne(
    { projectId: '8883fdef6f5144f50eb2a83cd34baa44' },
    {
      $set: {
        caseAttributesSchema: {
          type: 'object',
          properties: { smoker: { type: 'boolean' } },
          required: ['smoker']
        }
      }
    }
  );
  const output = await run(['clinicalCase']);
  // Only a warning
  assert.equal(process.exitCode, undefined);
  assert.match(output, /with warnings/);
  assert.match(
    output,
    /clinicalCase latestRevision\.attributes\.smoker: Required/
  );
});

test('checks only documents or only attributes', async () => {
  const documents = await run(['clinicalCase'], { documentsOnly: true });
  assert.match(documents, /Validating: clinicalCase/);
  assert.doesNotMatch(documents, /Checking the attributes/);
  const attributes = await run(['clinicalCase'], { attributesOnly: true });
  assert.doesNotMatch(attributes, /Validating: clinicalCase/);
  assert.match(attributes, /Checking the attributes/);
});

test('checks each collection selected by model names', async t => {
  const configPath = await adminCliMongoConfig(t);
  const result = await runAdminCli(
    ['db', 'check', 'user', 'group'],
    configPath
  );
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(
    [...result.stdout.matchAll(/^Validating: (\w+)$/gm)]
      .map(match => match[1])
      .sort(),
    ['group', 'user']
  );
});

test('rejects unknown model names before scanning any model', async t => {
  const configPath = await adminCliMongoConfig(t);
  const result = await runAdminCli(
    ['db', 'check', 'user', 'users'],
    configPath
  );
  assert.equal(result.code, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^Error\nUnknown model name\(s\): "users"\./);
  assert.match(
    result.stderr,
    /^Available model names: .*\bclinicalCase\b.*\buser\b/m
  );
  assert.doesNotMatch(result.stderr, /^ {4}at /m);
});

test('limits attributes-only checks to clinicalCase', async t => {
  const configPath = await adminCliMongoConfig(t);
  const all = await runAdminCli(
    ['db', 'check', '--attributes-only'],
    configPath
  );
  assert.equal(all.code, 0, all.stderr);
  assert.match(all.stdout, /Checking the attributes/);
  assert.doesNotMatch(all.stdout, /^Validating:/m);

  const cases = await runAdminCli(
    ['db', 'check', 'clinicalCase', '--attributes-only'],
    configPath
  );
  assert.deepEqual(cases, all);

  const wrongModel = await runAdminCli(
    ['db', 'check', 'user', '--attributes-only'],
    configPath
  );
  assert.equal(wrongModel.code, 1);
  assert.equal(wrongModel.stdout, '');
  assert.match(
    wrongModel.stderr,
    /--attributes-only checks only clinicalCase\./
  );
});
