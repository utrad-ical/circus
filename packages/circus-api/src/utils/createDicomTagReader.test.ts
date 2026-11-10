import assert from 'node:assert/strict';
import { test, before } from 'node:test';
import createDicomTagReader, {
  extractAge,
  parseDate,
  readDicomTags
} from './createDicomTagReader.ts';
import fs from 'fs-extra';
import path from 'path';

let content: Buffer;

before(async () => {
  content = await fs.readFile(
    path.join(__dirname, '../../test/dicom/CT-MONO2-16-brain.dcm')
  );
});

test('default', async () => {
  const reader = await createDicomTagReader({});
  const result = await reader(content as unknown as ArrayBuffer);
  assert.equal(result.modality, 'CT');
  assert.deepEqual(result.seriesDate, new Date('1999-05-05T10:52:34.530Z'));
  assert.equal(result.patientInfo.patientName, 'Anonymized');
});

test('with defaultTzOffset', async () => {
  const reader = await createDicomTagReader({ defaultTzOffset: 540 });
  const result = await reader(content as unknown as ArrayBuffer);
  assert.deepEqual(result.seriesDate, new Date('1999-05-05T01:52:34.530Z'));
});

test('parseDate', () => {
  assert.deepEqual(
    parseDate('20181224', '201830'),
    new Date('2018-12-24T20:18:30Z')
  );
  assert.deepEqual(
    parseDate('20200308', '154219.123456'),
    new Date('2020-03-08T15:42:19.123Z')
  );
  assert.deepEqual(
    parseDate('19870430', '235959.999'),
    new Date('1987-04-30T23:59:59.999Z')
  );
});

test('extractAge', () => {
  assert.equal(
    extractAge('020Y', '19700505', new Date('1980-08-30T00:00:00Z')),
    20
  );
  assert.equal(
    extractAge(undefined, '19700505', new Date('1980-08-30T00:00:00Z')),
    10
  );
  assert.equal(extractAge(undefined, '19700505', undefined), undefined);
});

test('extractParameters', async () => {
  const dicomTags = await readDicomTags(content as unknown as ArrayBuffer);
  assert.equal(dicomTags.parameters.TransferSyntaxUID, '1.2.840.10008.1.2.1'); //UI
  assert.equal(dicomTags.parameters.PhotometricInterpretation, 'MONOCHROME2'); //CS
  assert.equal(dicomTags.parameters.InstanceNumber, 8); //IS
  assert.deepEqual(
    dicomTags.parameters.ImagePositionPatient,
    [-119.7656, -399.7656, -280]
  ); //DS
  assert.equal(dicomTags.parameters.SliceLocation, 280); //DS
  assert.equal(dicomTags.parameters.BitsAllocated, 16); //US
});
