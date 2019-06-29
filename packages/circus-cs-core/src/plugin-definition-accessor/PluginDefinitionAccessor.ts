export default interface PluginDefinitionAccessor {
  list: () => Promise<circus.PluginDefinition[]>;
  get: (pluginId: string) => Promise<circus.PluginDefinition>;
}
