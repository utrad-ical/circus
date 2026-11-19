import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test, before, beforeEach, mock } from 'node:test';
import { command } from './refresh-series-parameters.ts';
import { runAdminCli, writeAdminCliConfig } from '../test/util-admin-cli.ts';
import { setUpMongoFixture, usingModels } from '../test/util-mongo.ts';
import type { Models, DicomTagReader } from '../interface.ts';
import type { DicomFileRepository } from '@utrad-ical/circus-lib';

const modelsPromise = usingModels();
let commandFunc: Awaited<ReturnType<typeof command>>,
  dicomFileRepository: DicomFileRepository,
  models: Models,
  dicomTagReader: DicomTagReader;

const seriesUid = '111.222.333.444.555';
const overMaxDateSeriesUid = '111.222.333.444.444';

before(async () => {
  const spy = mock.method(console, 'log', () => {});
  const ab = new Uint8Array(10);

  dicomFileRepository = {
    getSeries: async (seriesUid: string) => ({
      load: async (image: number) => ab.buffer,
      save: () => Promise.resolve(),
      images: '1-10'
    }),
    deleteSeries: () => Promise.resolve()
  };

  dicomTagReader = (async () => {
    return {
      parameters: { PhotometricInterpretation: 'MONOCHROME2' }
    };
  }) as any as DicomTagReader;
});

beforeEach(async () => {
  const { db } = (await modelsPromise).database;
  models = (await modelsPromise).models;
  await setUpMongoFixture(db, ['series']);

  commandFunc = await command(undefined, {
    models,
    dicomTagReader,
    dicomFileRepository
  });
});

test('refresh series parameters', async () => {
  await commandFunc({});
  const seriesData = await models.series.findById(seriesUid);
  assert.equal(seriesData.parameters.PhotometricInterpretation, 'MONOCHROME2');
});

test('refresh series parameters with maxDate', async () => {
  await commandFunc({ maxDate: new Date('2020-08-30T00:00:00Z') });
  const seriesData = await models.series.findById(seriesUid);
  assert.equal(seriesData.parameters.PhotometricInterpretation, 'MONOCHROME2');
  const seriesData2 = await models.series.findById(overMaxDateSeriesUid);
  assert.equal(seriesData2.parameters.PhotometricInterpretation, undefined);
});

test('reports command and cleanup failures in order and fails on cleanup alone', async t => {
  const configPath = await writeAdminCliConfig(
    t,
    `import { fileURLToPath } from 'node:url';
      export default {
        database: { options: { mongoUrl: process.env.CIRCUS_MONGO_TEST_URL } },
        dicomFileRepository: { type: fileURLToPath(new URL('./repository.mjs', import.meta.url)) }
      };`
  );
  await writeFile(
    join(dirname(configPath), 'repository.mjs'),
    `export default async () => ({
      async getSeries() { throw new Error('Fixture series read failed'); },
      async dispose() { throw new Error('Fixture repository cleanup failed'); }
    });`
  );

  const both = runAdminCli(['refresh-series-parameters'], configPath);
  assert.equal(both.status, 1);
  assert.match(
    both.stderr,
    /^ERROR:\nError: Fixture series read failed\n[\s\S]*\nService cleanup also failed\.\nError: Fixture repository cleanup failed\n/
  );

  const cleanupOnly = runAdminCli(
    ['refresh-series-parameters', '--maxDate', '1900-01-01'],
    configPath
  );
  assert.equal(cleanupOnly.status, 1);
  assert.equal(cleanupOnly.stdout, '');
  assert.match(
    cleanupOnly.stderr,
    /^ERROR:\nError: Fixture repository cleanup failed\n/
  );
});
