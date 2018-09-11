import path from 'path';
import fs from 'fs-extra';
import * as info from './info';
import { PluginDefinition } from '../interface';

describe('before set info-dir', () => {
  test('occur error on setPluginDefinitions', async () => {
    const setDefs: PluginDefinition[] = [
      {
        pluginId: 'test01',
        pluginName: 'test01',
        version: '0.0.1',
        type: 'CAD',
        dockerImage: 'test01'
      }
    ];
    await expect(info.setPluginDefinitions(setDefs)).rejects.toThrow(
      'info-dir is not set'
    );
  });

  test('occur error on getPluginDefinitions', async () => {
    await expect(info.getPluginDefinitions()).rejects.toThrow(
      'info-dir is not set'
    );
  });
});

describe('info', () => {
  const testInfoDir = path.join(__dirname, '../../test/info/');

  beforeAll(() => {
    info.setInfoDir(testInfoDir);
  });

  afterAll(async () => {
    await fs.emptyDir(testInfoDir);
    await fs.rmdir(testInfoDir);
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
    await info.setPluginDefinitions(setDefs);

    const getDefs = await info.getPluginDefinitions();
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

    await expect(info.setPluginDefinitions(setDefs)).rejects.toThrow(
      'There is duplicated pluginId'
    );
  });
});
