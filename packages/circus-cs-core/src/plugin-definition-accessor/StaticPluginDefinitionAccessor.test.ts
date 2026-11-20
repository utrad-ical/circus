import assert from 'node:assert/strict';
import { describe, test, before } from 'node:test';
import path from 'path';
import createStaticPluginDefinitionAccessor from './StaticPluginDefinitionAccessor.ts';
import type * as circus from '../interface.ts';

describe('StaticPluginDefinitionAccessor', () => {
  const pluginDir = path.join(import.meta.dirname, '../../test/plugins/');
  let pluginDefs: circus.PluginDefinitionAccessor;

  before(async () => {
    pluginDefs = await createStaticPluginDefinitionAccessor(
      { dir: pluginDir },
      {}
    );
  });

  test('lists plug-in definitions', async () => {
    const defs = await pluginDefs.list();
    assert.equal(defs.length, 7);
  });

  test('returns a single plug-in definition', async () => {
    const def = await pluginDefs.get(
      'e3f245078d839ea804e100ada6183edf864624a2859b2a8341a0721378f13f97'
    );
    assert.deepEqual(def.pluginName, 'MRA-CAD');
  });
});
