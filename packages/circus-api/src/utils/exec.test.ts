import exec, { pExec } from './exec';

test('exec', async () => {
  const result = await exec('echo', ['Vega', 'Sirius']);
  expect(result).toMatch(/^Vega Sirius/);
});

test('pExec buffer', async () => {
  const { stdout: result } = (await pExec('echo', ['Altair'], {
    encoding: 'buffer'
  })) as { stdout: Buffer };
  expect(result instanceof Buffer).toBe(true);
  expect(result.toString('utf-8')).toBe('Altair\n');
});
