import mongo from 'mongodb';
import { PluginDefinition } from '../interface';
import { PluginDefinitionAccessor } from '../CsCore';

export default function createMongoPluginDefinitionAccessor(
  collection: mongo.Collection<PluginDefinition>
): PluginDefinitionAccessor {
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
}
