import path from 'path';
import createStaticPluginDefinitionAccessor from './StaticPluginDefinitionAccessor';
import PluginDefinitionAccessor from './PluginDefinitionAccessor';

describe('StaticPluginDefinitionAccessor', () => {
  const pluginDir = path.join(__dirname, '../../test/plugins/');
  let pluginDefs: PluginDefinitionAccessor;

  beforeAll(async () => {
    pluginDefs = await createStaticPluginDefinitionAccessor(
      { dir: pluginDir },
      {}
    );
  });

  test('get the list of plugin definitions', async () => {
    const defs = await pluginDefs.list();
    expect(defs).toHaveLength(7);
  });

  test('get one plugin definition', async () => {
    const def = await pluginDefs.get(
      'e3f245078d839ea804e100ada6183edf864624a2859b2a8341a0721378f13f97'
    );
    expect(def.pluginName).toEqual('MRA-CAD');
  });
});
