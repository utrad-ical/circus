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

test('checks each collection selected by a repeated target option', async t => {
  const configPath = await adminCliMongoConfig(t);
  const result = runAdminCli(
    ['db-check', '-t', 'user', '-t', 'group'],
    configPath
  );
  assert.equal(result.status, 0, result.stderr);
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
  const result = runAdminCli(
    ['db-check', '-t', 'user', '-t', 'users'],
    configPath
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^ERROR:\nUnknown model name\(s\): "users"\./);
  assert.match(
    result.stderr,
    /^Available model names: .*\bclinicalCase\b.*\buser\b/m
  );
  assert.doesNotMatch(result.stderr, /^ {4}at /m);
});
