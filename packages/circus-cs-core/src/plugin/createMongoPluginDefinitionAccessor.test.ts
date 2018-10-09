import path from 'path';
import fs from 'fs-extra';
import mongo from 'mongodb';
import { getTestCollection } from '../testHelper';
import createMongoPluginDefinitionAccessor from './createMongoPluginDefinitionAccessor';

describe('pluginDefinitionAccesor', () => {
  let client: mongo.MongoClient;
  let collection: mongo.Collection;

  beforeAll(async () => {
    ({ client, collection } = await getTestCollection('pluginDefinitions'));
    const defs = JSON.parse(
      await fs.readFile(
        path.join(__dirname, '../../test/plugins/plugins.json'),
        'utf8'
      )
    );
    await collection.deleteMany({});
    await collection.insertMany(defs);
  });

  afterAll(async () => {
    await client.close(true);
  });

  test('get plugin definition', async () => {
    const pluginDef = createMongoPluginDefinitionAccessor(collection);
    await pluginDef.get('circus-mock/empty');
  });
});
