import assert from 'node:assert/strict';
import { test, before, after, beforeEach } from 'node:test';
import type Storage from './Storage.ts';
import * as path from 'path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import createLocalStorage from './LocalStorage.ts';

let store: Storage;

const tmpDir = path.join(import.meta.dirname, 'tmp-dir');

before(async function () {
  await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.mkdir(tmpDir, { recursive: true });
  store = await createLocalStorage({
    dataDir: tmpDir,
    nameToPath: (p: string) => path.join(p.substr(0, 2), p + '.txt')
  });
});

beforeEach(async function () {
  await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.mkdir(tmpDir, { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'aa'));
  await fs.writeFile(path.join(tmpDir, 'aa', 'aabbcc.txt'), 'coconut');
});

after(async function () {
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('rejects a storage root that does not exist', async function () {
  await assert.rejects(
    createLocalStorage({ root: 'somewhere/over/the/rainbow' })
  );
});

test('writes the content to a path derived from the key', async function () {
  await store.write('xxyyzz', Buffer.from('biscuit'));
  const out = path.join(tmpDir, 'xx', 'xxyyzz.txt');
  assert.equal(existsSync(out), true);
  assert.equal(await fs.readFile(out, 'utf8'), 'biscuit');
});

test('reads stored content and rejects a missing key', async function () {
  assert.equal(
    Buffer.from(await store.read('aabbcc')).toString('utf8'),
    'coconut'
  );
  await assert.rejects(store.read('notafile'));
});

test('distinguishes existing keys from missing keys', async function () {
  assert.equal(await store.exists('aabbcc'), true);
  assert.equal(await store.exists('xxyyzz'), false);
});

test('deletes the stored file', async function () {
  assert.equal(existsSync(path.join(tmpDir, 'aa', 'aabbcc.txt')), true);
  await store.remove('aabbcc');
  assert.equal(existsSync(path.join(tmpDir, 'aa', 'aabbcc.txt')), false);
});
