import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { command } from './dump-dicom.ts';
import path from 'path';
import createDicomTagReader from '../utils/createDicomTagReader.ts';

test('dump-dicom', async () => {
  const dicomTagReader = await createDicomTagReader({});
  const commandFunc = await command(undefined, { dicomTagReader });
  const spy = mock.method(console, 'log', () => {});
  const file = path.join(__dirname, '../../test/dicom/CT-MONO2-16-brain.dcm');
  await commandFunc({ _args: [file] });
  assert.partialDeepStrictEqual(spy.mock.calls[0].arguments[0], {
    modelName: 'PQ5000'
  });
});
