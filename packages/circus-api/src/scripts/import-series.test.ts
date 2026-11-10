import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { test, beforeEach, mock } from 'node:test';
import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib';
import path from 'path';
import createTestLogger from '../test/util-logger.ts';
import { setUpMongoFixture, usingModels } from '../test/util-mongo.ts';
import createDicomImporter from '../createDicomImporter.ts';
import type { Models } from '../interface.ts';
import type { CommandFunc } from './Command.ts';
import { command } from './import-series.ts';
import createDicomTagReader from '../utils/createDicomTagReader.ts';
import createTransactionManager from '../createTransactionManager.ts';

const modelsPromise = usingModels(),
  domain = 'default';
let commandFunc: CommandFunc,
  dicomFileRepository: MemoryDicomFileRepository,
  models: Models;

beforeEach(async () => {
  const { database, validator } = await modelsPromise;
  models = (await modelsPromise).models;
  await setUpMongoFixture(database.db, ['series']);
  const apiLogger = await createTestLogger();
  dicomFileRepository = new MemoryDicomFileRepository({});
  const dicomTagReader = await createDicomTagReader({});
  const transactionManager = await createTransactionManager(
    {},
    { database, validator }
  );
  const dicomImporter = await createDicomImporter(
    {},
    {
      dicomFileRepository,
      apiLogger,
      dicomTagReader,
      dicomUtilityRunner: null as any, // Dummy
      transactionManager
    }
  );
  commandFunc = await command(null, { dicomImporter });
});

const seriesUid = '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20';

test('import from a DICOM file', async () => {
  const spy = mock.method(console, 'log', () => {});
  const file = path.join(
    import.meta.dirname,
    '../../test/dicom/CT-MONO2-16-brain.dcm'
  );
  await commandFunc({ domain, _args: [file] });
  assert.ok(
    spy.mock.calls
      .map(c => c.arguments)
      .some((item: unknown) => isDeepStrictEqual(item, ['Imported 1 file.']))
  );
  const seriesAccessor = await dicomFileRepository.getSeries(seriesUid);
  assert.equal(seriesAccessor.images, '8');
  assert.equal((await seriesAccessor.load(8)) instanceof ArrayBuffer, true);
  const seriesData = await models.series.findById(seriesUid);
  assert.equal(seriesData.domain, 'default');
});

test('import from a zip file', async () => {
  const spy = mock.method(console, 'log', () => {});
  const file = path.join(import.meta.dirname, '../../test/dicom/test.zip');
  await commandFunc({ domain, _args: [file] });
  assert.ok(
    spy.mock.calls
      .map(c => c.arguments)
      .some((item: unknown) => isDeepStrictEqual(item, ['Imported 1 file.']))
  );
  const seriesAccessor = await dicomFileRepository.getSeries(seriesUid);
  assert.equal(seriesAccessor.images, '8');
  assert.equal((await seriesAccessor.load(8)) instanceof ArrayBuffer, true);
  const seriesData = await models.series.findById(seriesUid);
  assert.equal(seriesData.domain, 'default');
});

test('throws when domain is unspecified', async () => {
  await assert.rejects(commandFunc({ _args: ['dummy'] }), {
    message: /Domain must be specified/
  });
});

// TODO: check error on broken DICOM file
// TODO: check error on broken ZIP file
