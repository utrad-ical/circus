import createDicomTagReader from './createDicomTagReader';
import fs from 'fs-extra';
import path from 'path';

let content: Buffer;

beforeAll(async () => {
  content = await fs.readFile(
    path.join(__dirname, '../../test/dicom/CT-MONO2-16-brain.dcm')
  );
});

test('default', async () => {
  const reader = await createDicomTagReader({});
  const result = await reader(content);
  expect(result.modality).toBe('CT');
  expect(result.seriesDate).toEqual(new Date('1999-05-05T10:52:34.530Z'));
  expect(result.patientInfo.patientName).toBe('Anonymized');
});

test('with defaultTzOffset', async () => {
  const reader = await createDicomTagReader({ defaultTzOffset: 540 });
  const result = await reader(content);
  expect(result.seriesDate).toEqual(new Date('1999-05-05T01:52:34.530Z'));
});
