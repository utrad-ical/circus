import assert from 'node:assert/strict';
import { it, before, after, beforeEach } from 'node:test';
import type Storage from './Storage.ts';
import * as path from 'path';
import * as fs from 'fs-extra';
import createLocalStorage from './LocalStorage.ts';

let store: Storage;

const tmpDir = path.join(__dirname, 'tmp-dir');

before(async function () {
  await fs.emptyDir(tmpDir);
  store = await createLocalStorage({
    dataDir: tmpDir,
    nameToPath: (p: string) => path.join(p.substr(0, 2), p + '.txt')
  });
});

beforeEach(async function () {
  await fs.emptyDir(tmpDir);
  await fs.outputFile(path.join(tmpDir, 'aa', 'aabbcc.txt'), 'coconut');
});

after(async function () {
  if (tmpDir) {
    await fs.remove(tmpDir);
  }
});

it('should throw error for nonexistent root', async function () {
  await assert.rejects(
    createLocalStorage({ root: 'somewhere/over/the/rainbow' })
  );
});

it('should execute write()', async function () {
  await store.write('xxyyzz', Buffer.from('biscuit'));
  const out = path.join(tmpDir, 'xx', 'xxyyzz.txt');
  assert.equal(await fs.pathExists(out), true);
  assert.equal(await fs.readFile(out, 'utf8'), 'biscuit');
});

it('should execute read()', async function () {
  assert.equal(
    Buffer.from(await store.read('aabbcc')).toString('utf8'),
    'coconut'
  );
  await assert.rejects(store.read('notafile'));
});

it('should execute exists()', async function () {
  assert.equal(await store.exists('aabbcc'), true);
  assert.equal(await store.exists('xxyyzz'), false);
});

it('should execute remove()', async function () {
  assert.equal(
    await fs.pathExists(path.join(tmpDir, 'aa', 'aabbcc.txt')),
    true
  );
  await store.remove('aabbcc');
  assert.equal(
    await fs.pathExists(path.join(tmpDir, 'aa', 'aabbcc.txt')),
    false
  );
});
