import exec from './exec';

it('exec', async () => {
  const result = await exec('echo', ['Vega', 'Sirius']);
  expect(result).toMatch(/^Vega Sirius/);
});
