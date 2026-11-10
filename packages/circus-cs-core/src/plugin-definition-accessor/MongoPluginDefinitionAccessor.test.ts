import assert from 'node:assert/strict';
import { describe, test, before, after } from 'node:test';
import path from 'path';
import fs from 'fs-extra';
import { testClientPool } from '../testHelper.ts';
import createMongoPluginDefinitionAccessor from './MongoPluginDefinitionAccessor.ts';
import type { MongoClientPool } from '../mongoClientPool.ts';

describe('MongoPluginDefinitionAccesor', () => {
  let mongoClientPool: MongoClientPool;

  before(async () => {
    mongoClientPool = await testClientPool();
    const collection = (await mongoClientPool.connect('dummy'))
      .db()
      .collection('pluginDefinitions');
    const defs = JSON.parse(
      await fs.readFile(
        path.join(import.meta.dirname, '../../test/plugins/plugins.json'),
        'utf8'
      )
    );
    await collection.deleteMany({});
    await collection.insertMany(defs);
  });

  after(async () => {
    await mongoClientPool.dispose();
  });

  test('get plugin definition', async () => {
    const collectionName = 'pluginDefinitions';
    const accessor = await createMongoPluginDefinitionAccessor(
      { collectionName },
      { mongoClientPool }
    );
    const def = await accessor.get(
      'e3f245078d839ea804e100ada6183edf864624a2859b2a8341a0721378f13f97'
    );
    assert.equal(def.pluginName, 'MRA-CAD');
  });
});
