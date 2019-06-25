import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import PluginDefinitionAccessor from '../plugin-definition-accessor/PluginDefinitionAccessor';
import { table } from 'table';

const listPlugins: FunctionService<
  Command,
  { pluginDefinitionAccessor: PluginDefinitionAccessor }
> = async (options, deps) => {
  const { pluginDefinitionAccessor } = deps;

  return async () => {
    const list = await pluginDefinitionAccessor.list();
    const rows = list.map(p => [p.pluginId, p.pluginName, p.version]);
    rows.unshift(['Plug-in ID', 'Name', 'Version']);
    console.log(table(rows));
  };
};

listPlugins.dependencies = ['pluginDefinitionAccessor'];

export default listPlugins;
