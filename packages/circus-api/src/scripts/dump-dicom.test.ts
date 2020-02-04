import { command } from './dump-dicom';
import path from 'path';
import createDicomTagReader from '../utils/createDicomTagReader';

test('dump-dicom', async () => {
  const dicomTagReader = await createDicomTagReader({});
  const commandFunc = await command(undefined, { dicomTagReader });
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const file = path.join(__dirname, '../../test/dicom/CT-MONO2-16-brain.dcm');
  await commandFunc({ _args: [file] });
  expect(spy.mock.calls[0][0]).toMatchObject({ modelName: 'PQ5000' });
});
