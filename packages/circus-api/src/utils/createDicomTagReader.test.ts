import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import createDicomTagReader, {
  extractAge,
  parseDate,
  readDicomTags
} from './createDicomTagReader.ts';
import fs from 'node:fs/promises';
import path from 'path';

let content: Buffer;
const originalTimeZone = process.env.TZ;

before(async () => {
  process.env.TZ = 'UTC';
  content = await fs.readFile(
    path.join(import.meta.dirname, '../../test/dicom/CT-MONO2-16-brain.dcm')
  );
});

after(() => {
  if (originalTimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimeZone;
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

test('uses the process time zone when the DICOM file has no offset', async () => {
  process.env.TZ = 'America/New_York';
  try {
    const result = await readDicomTags(content as unknown as ArrayBuffer);
    assert.deepEqual(result.seriesDate, new Date('1999-05-05T14:52:34.530Z'));
    assert.deepEqual(
      parseDate('20260115', '100000'),
      new Date('2026-01-15T15:00:00Z')
    );
    const utc = await readDicomTags(content as unknown as ArrayBuffer, {
      defaultTzOffset: 0
    });
    assert.deepEqual(utc.seriesDate, new Date('1999-05-05T10:52:34.530Z'));
  } finally {
    process.env.TZ = 'UTC';
  }
});

test('uses the DICOM offset ahead of the configured default', async () => {
  // Timezone Offset From UTC, encoded as an explicit VR little-endian SH tag.
  const header = Buffer.from([0x08, 0, 0x01, 0x02, 0x53, 0x48, 0x06, 0]);
  for (const [offset, time] of [
    ['+0900', '1999-05-05T01:52:34.530Z'],
    ['-0330', '1999-05-05T14:22:34.530Z']
  ]) {
    const data = Buffer.concat([content, header, Buffer.from(offset + ' ')]);
    const result = await readDicomTags(data as unknown as ArrayBuffer, {
      defaultTzOffset: 180
    });
    assert.deepEqual(result.seriesDate, new Date(time));
  }
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

test('reads Pixel Spacing as the row spacing (y) and then the column spacing (x)', async () => {
  // Replace the value of the same length
  const original = Buffer.from('0.46875\\0.46875', 'latin1');
  const index = content.indexOf(original);
  assert.ok(index > 0);
  const modified = Buffer.from(content);
  modified.write('0.36875\\0.46875', index, 'latin1');
  const dicomTags = await readDicomTags(modified as unknown as ArrayBuffer);
  assert.equal(dicomTags.parameters.pixelSpacingX, 0.46875);
  assert.equal(dicomTags.parameters.pixelSpacingY, 0.36875);
});
