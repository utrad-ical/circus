import assert from 'node:assert/strict';
import { test } from 'node:test';
import exec, { pExec } from './exec.ts';

test('exec', async () => {
  const result = await exec('echo', ['Vega', 'Sirius']);
  assert.match(result, /^Vega Sirius/);
});

test('pExec buffer', async () => {
  const { stdout: result } = (await pExec('echo', ['Altair'], {
    encoding: 'buffer'
  })) as { stdout: Buffer };
  assert.equal(result instanceof Buffer, true);
  assert.equal(result.toString('utf-8'), 'Altair\n');
});
