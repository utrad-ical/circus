import { PluginDefinition } from '../interface';

export default interface PluginDefinitionAccessor {
  list: () => Promise<PluginDefinition[]>;
  get: (pluginId: string) => Promise<PluginDefinition>;
}
