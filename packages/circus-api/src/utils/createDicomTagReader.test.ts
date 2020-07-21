import createDicomTagReader, {
  parseDate,
  readDicomTags
} from './createDicomTagReader';
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

test('parseDate', () => {
  expect(parseDate('20181224', '201830')).toEqual(
    new Date('2018-12-24T20:18:30Z')
  );
  expect(parseDate('20200308', '154219.123456')).toEqual(
    new Date('2020-03-08T15:42:19.123Z')
  );
  expect(parseDate('19870430', '235959.999')).toEqual(
    new Date('1987-04-30T23:59:59.999Z')
  );
});

test('extractParameters', async () => {
  const dicomTags = await readDicomTags(content);
  expect(dicomTags.parameters.TransferSyntaxUID).toBe('1.2.840.10008.1.2.1'); //UI
  expect(dicomTags.parameters.PhotometricInterpretation).toBe('MONOCHROME2'); //CS
  expect(dicomTags.parameters.InstanceNumber).toBe(8); //IS
  expect(dicomTags.parameters.ImagePositionPatient).toEqual([
    -119.7656,
    -399.7656,
    -280
  ]); //DS
  expect(dicomTags.parameters.SliceLocation).toBe(280); //DS
  expect(dicomTags.parameters.BitsAllocated).toBe(16); //US
});
