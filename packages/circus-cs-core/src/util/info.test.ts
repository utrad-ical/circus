import path from 'path';
import fs from 'fs-extra';
import pluginDefinitionAccesor, { PluginDefinitionAccessor } from './info';
import { PluginDefinition } from '../interface';

describe('pluginDefinitionAccesor', () => {
  let pluginDefs: PluginDefinitionAccessor;
  const testCoreWorkingDir = path.join(__dirname, '../../test/core-tmp/');

  beforeAll(() => {
    pluginDefs = pluginDefinitionAccesor(testCoreWorkingDir);
  });

  afterAll(async () => {
    await fs.emptyDir(testCoreWorkingDir);
    await fs.rmdir(testCoreWorkingDir);
  });

  test('Set and get plugin definitions', async () => {
    const setDefs: PluginDefinition[] = [
      {
        pluginId: 'test01',
        pluginName: 'test01',
        version: '0.0.1',
        type: 'CAD',
        dockerImage: 'test01'
      },
      {
        pluginId: 'test03',
        pluginName: 'test03',
        version: '0.0.3',
        type: 'CAD',
        dockerImage: 'test03'
      }
    ];
    await pluginDefs.save(setDefs);

    const getDefs = await pluginDefs.load();
    expect(setDefs).toEqual(getDefs);
  });

  test('Plug-in id duplication error', async () => {
    const setDefs: PluginDefinition[] = [
      {
        pluginId: 'test02',
        pluginName: 'test02-some',
        version: '0.0.2',
        type: 'CAD',
        dockerImage: 'test02-some'
      },
      {
        pluginId: 'test02',
        pluginName: 'test02-other',
        version: '0.1.2',
        type: 'CAD',
        dockerImage: 'test02-other'
      }
    ];

    await expect(pluginDefs.save(setDefs)).rejects.toThrow(
      'There is duplicated pluginId'
    );
  });
});
