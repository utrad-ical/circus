import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { commandDeps, runCommand, tempDirectory } from '../test/command.ts';
import getArgs from './blob-get.args.ts';
import get from './blob-get.ts';
import postArgs from './blob-post.args.ts';
import post from './blob-post.ts';

const data = Buffer.from([0, 255, 42]);
const hash = createHash('sha1').update(data).digest('hex');

test('uploads a file as binary data to its content hash', async t => {
  t.mock.method(console, 'log', () => {});
  const file = join(await tempDirectory(t), 'fixture.bin');
  await writeFile(file, data);
  const fetch = t.mock.fn(async (resource: string, init?: RequestInit) => {
    assert.equal(resource, `blob/${hash}`);
    assert.equal(init?.method, 'PUT');
    assert.equal(
      new Headers(init?.headers).get('Content-Type'),
      'application/octet-stream'
    );
    assert.deepEqual(init?.body, data);
    return new Response(null, { status: 204 });
  });

  await runCommand(
    'blob',
    postArgs,
    post,
    [file],
    commandDeps({ getFetch: () => fetch })
  );

  assert.equal(fetch.mock.callCount(), 1);
});

test('writes a blob after a successful request and preserves it if another request fails', async t => {
  t.mock.method(console, 'log', () => {});
  const directory = await tempDirectory(t);
  const missingHash = '0'.repeat(40);
  const deps = commandDeps({
    getFetch: () => async resource => {
      if (resource === `blob/${hash}`)
        return new Response(new Uint8Array(data));
      assert.equal(resource, `blob/${missingHash}`);
      throw new Error('Blob not found');
    }
  });

  await assert.rejects(
    runCommand(
      'blob',
      getArgs,
      get,
      ['--out', directory, hash, missingHash],
      deps
    ),
    /Blob not found/
  );
  assert.deepEqual(await readdir(directory), [hash]);
  assert.deepEqual(await readFile(join(directory, hash)), data);
});
