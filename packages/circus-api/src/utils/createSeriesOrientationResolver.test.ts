import createDicomTagReader from './createDicomTagReader';
import {
  MemoryDicomFileRepository,
  DicomFileRepository
} from '@utrad-ical/circus-lib';
import createSeriesOrientationResolver, {
  SeriesOrientationResolver
} from './createSeriesOrientationResolver';
import fs from 'fs-extra';
import path from 'path';
import { DicomTagReader } from '../interface';

let dicomFileRepository: DicomFileRepository;
let dicomTagReader: DicomTagReader;
let resolveSeriesOrientation: SeriesOrientationResolver;

beforeEach(async () => {
  dicomFileRepository = new MemoryDicomFileRepository({});
  dicomTagReader = await createDicomTagReader({});
  resolveSeriesOrientation = await createSeriesOrientationResolver(
    {},
    { dicomFileRepository, dicomTagReader }
  );
});

test('head-first', async () => {
  const series = await dicomFileRepository.getSeries(
    '1.2.276.0.7230010.3.1.3.3289186935.22648.1590026998.547'
  );
  for (let f = 1; f <= 10; f++) {
    const num = ('000' + f.toString()).slice(-3);
    const file = await fs.readFile(
      path.join(__dirname, `../../test/dicom/head-first${num}.dcm`)
    );
    await series.save(f, file.buffer as ArrayBuffer);
  }
  const result = await resolveSeriesOrientation(
    '1.2.276.0.7230010.3.1.3.3289186935.22648.1590026998.547',
    1,
    10
  );
  expect(result).toEqual({ start: 1, end: 10, delta: 1 });
});

test('foot-first', async () => {
  const series = await dicomFileRepository.getSeries(
    '1.2.276.0.7230010.3.1.3.3289186935.22648.1590026998.548'
  );
  for (let f = 1; f <= 10; f++) {
    const num = ('000' + f.toString()).slice(-3);
    const file = await fs.readFile(
      path.join(__dirname, `../../test/dicom/foot-first${num}.dcm`)
    );
    await series.save(f, file.buffer as ArrayBuffer);
  }
  const result = await resolveSeriesOrientation(
    '1.2.276.0.7230010.3.1.3.3289186935.22648.1590026998.548',
    1,
    10
  );
  expect(result).toEqual({ start: 10, end: 1, delta: -1 });
});

test('should return head-first if single image series', async () => {
  const dicomTagReader = await createDicomTagReader({});
  const series = await dicomFileRepository.getSeries(
    '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20'
  );
  const file = await fs.readFile(
    path.join(__dirname, '../../test/dicom/CT-MONO2-16-brain.dcm')
  );
  await series.save(1, file.buffer as ArrayBuffer);
  const result = await resolveSeriesOrientation(
    '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20',
    1,
    1
  );
  expect(result).toEqual({ start: 1, end: 1, delta: 1 });
});
