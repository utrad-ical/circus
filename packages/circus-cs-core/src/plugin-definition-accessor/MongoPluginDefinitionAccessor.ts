import { PluginDefinitionAccessor } from '../CsCore';
import { FunctionService } from '@utrad-ical/circus-lib';
import { MongoClientPool } from '../mongoClientPool';

const createMongoPluginDefinitionAccessor: FunctionService<
  PluginDefinitionAccessor,
  { mongoClientPool: MongoClientPool }
> = async (options: any, { mongoClientPool }) => {
  const { mongoUrl, collectionName } = options;
  const client = await mongoClientPool.connect(mongoUrl);
  const collection = client.db().collection(collectionName);

  const get = async (pluginId: string) => {
    if (!pluginId) throw new Error('Plug-in ID undefined');

    const pluginDefinition = await collection.findOne({ pluginId });
    if (!pluginDefinition)
      throw new Error('No such plug-in definition: ' + pluginId);

    return pluginDefinition;
  };
  const list = async () => {
    return await collection.find().toArray();
  };
  return { get, list };
};

createMongoPluginDefinitionAccessor.dependencies = ['mongoClientPool'];

export default createMongoPluginDefinitionAccessor;
