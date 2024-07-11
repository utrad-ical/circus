import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import path from 'path';
import fs from 'fs-extra';

const cachePath = path.join(__dirname, '../../../test/plugin-cache');

const pluginId =
  'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2';
const mockPluginDir = path.join(cachePath, pluginId);

const mockPath = path,
  mockFs = fs;
jest.mock('../../utils/dockerFileExtractor', () => {
  return () => ({
    extractToPath: async () => {
      const displayDir = mockPath.join(mockPluginDir, 'displays');
      await mockFs.ensureDir(displayDir);
      await mockFs.writeFile(
        mockPath.join(displayDir, 'remoteEntry.js'),
        'Hello'
      );
    },
    dispose: () => Promise.resolve()
  });
});

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;
beforeAll(async () => {
  await fs.remove(mockPluginDir);
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
});
afterAll(async () => {
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
