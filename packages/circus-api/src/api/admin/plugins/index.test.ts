import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { setUpMongoFixture } from '../../../test/util-mongo';
import { AxiosInstance } from 'axios';
import httpStatus from 'http-status';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

describe('admin/plugins', () => {
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['pluginDefinitions']);
  });

  test('should return list of plugins', async () => {
    const res = await axios.get('api/admin/plugins');
    expect(res.status).toBe(200);
    expect(res.data.items).toBeInstanceOf(Array);
    expect(
      res.data.items.some(
        (p: any) => p.pluginName === 'MOCK-VALIDATION-FAILURE'
      )
    ).toBe(true);
  });

  test('should update plugin', async () => {
    const res = await axios.get('api/admin/plugins');
    const pluginId = res.data.items[0].pluginId;
    const res2 = await axios.patch(`api/admin/plugins/${pluginId}`, {
      pluginName: 'NEW-NAME'
    });
    expect(res2.status).toBe(204);
    const res3 = await axios.get('api/admin/plugins');
    expect(res3.data.items.some((p: any) => p.pluginName === 'NEW-NAME')).toBe(
      true
    );
  });

  test('should search plugins', async () => {
    const res = await axios.get('api/admin/plugins', {
      params: { filter: JSON.stringify({ type: 'CAD' }) }
    });
    expect(res.status).toBe(200);
    expect(res.data.items.length).toBe(3);
  });

  test('should create plugin', async () => {
    const res = await axios.post('api/admin/plugins', {
      pluginId:
        'aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbccccccccccccccccdddddddddddddddd',
      pluginName: 'NEW-PLUGIN',
      version: '1.0.0',
      type: 'CAD',
      description: 'This is a new plugin',
      runConfiguration: { timeout: 1000, gpus: '1' },
      icon: { glyph: 'calc', color: '#ffffff', backgroundColor: '#555555' },
      displayStrategy: []
    });
    expect(res.status).toBe(httpStatus.CREATED);
    const res2 = await axios.get('api/admin/plugins');
    expect(
      res2.data.items.some((p: any) => p.pluginName === 'NEW-PLUGIN')
    ).toBe(true);
  });

  test('should create remote plugin', async () => {
    const res = await axios.post('api/admin/plugins', {
      pluginName: 'NEW-REMOTE-PLUGIN',
      version: '1.0.0',
      type: 'CAD+remote',
      description: 'This is a new remote plug-in',
      runConfiguration: {
        adapter: 'HttpRemoteCadAdapter',
        parameters: {
          endpoint:
            'https://abcdefg123.execute-api.ap-northeast-1.amazonaws.com/prod/users',
          authentification: 'aaaaabbbbcccccdddddeeeee',
          maxConcurrent: 5,
          timeout: 300,
          env: [
            {
              encryptSecret: 'rsa:111122223333'
            }
          ]
        }
      },
      icon: { glyph: 'calc', color: '#ffffff', backgroundColor: '#555555' },
      displayStrategy: []
    });
    expect(res.status).toBe(201);
    const res2 = await axios.get('api/admin/plugins');
    expect(
      res2.data.items.some((p: any) => p.pluginName === 'NEW-REMOTE-PLUGIN')
    ).toBe(true);
  });
});
