import path from 'path';
import createStaticPluginDefinitionAccessor from './createStaticPluginDefinitionAccessor';
import { PluginDefinitionAccessor } from '../CsCore';

describe('pluginDefinitionAccesor', () => {
  const pluginDir = path.join(__dirname, '../../test/plugins/');
  let pluginDefs: PluginDefinitionAccessor;

  beforeAll(() => {
    pluginDefs = createStaticPluginDefinitionAccessor(pluginDir);
  });

  test('list plugin definitions from exists plugin.json', async () => {
    const readonlyPluginDefs = createStaticPluginDefinitionAccessor(pluginDir);
    await readonlyPluginDefs.list();
  });

  test('Get plugin definitions', async () => {
    const getDefs = await pluginDefs.list();
    expect(getDefs.length).toEqual(7);
  });

  test('Get a plugin definition', async () => {
    const getDef = await pluginDefs.get('circus/mra_cad');
    expect(getDef.dockerImage).toEqual(
      'e3f245078d839ea804e100ada6183edf864624a2859b2a8341a0721378f13f97'
    );
  });
});
