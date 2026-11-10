import { test, before, after } from 'node:test';
import { expect } from 'expect';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import path from 'path';
import fs from 'fs-extra';

const cachePath = path.join(__dirname, '../../../test/plugin-cache');

const pluginId =
  'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2';
const mockPluginDir = path.join(cachePath, pluginId);

// Replaces the Docker-based extractor
const createDockerFileExtractor = () => ({
  extractToPath: async () => {
    const displayDir = path.join(mockPluginDir, 'displays');
    await fs.ensureDir(displayDir);
    await fs.writeFile(path.join(displayDir, 'remoteEntry.js'), 'Hello');
  },
  dispose: () => Promise.resolve()
});

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;
before(async () => {
  await fs.remove(mockPluginDir);
  apiTest = await setUpAppForRoutesTest({ createDockerFileExtractor } as any);
  ax = apiTest.axiosInstances;
});
after(async () => {
  await apiTest.tearDown();
  await fs.remove(mockPluginDir);
});

test('returns the module container', async () => {
  const res = await ax.alice.get(
    `api/plugin-displays/${pluginId}/remoteEntry.js`
  );
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toContain('text/javascript');
  expect(res.data).toBe('Hello');
});
