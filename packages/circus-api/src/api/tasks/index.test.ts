import { AxiosInstance } from 'axios';
import { Readable } from 'form-data';
import { ApiTest, setUpAppForRoutesTest } from '../../../test/util-routes';
import { readFromStream } from '../../../test/util-stream';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => apiTest.tearDown());

describe('search', () => {
  test('should return the list of tasks of the user', async () => {
    const res = await axios.get('api/tasks');
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(3);
  });

  test('search with taskId', async () => {
    const res = await axios.get('api/tasks', {
      params: { filter: JSON.stringify({ taskId: 'aaaabbbbcccc1111' }) }
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].name).toBe('Importing DICOM files');
  });

  test('should not show tasks of other user in search results', async () => {
    const res = await axios.get('api/tasks', {
      params: { filter: JSON.stringify({ taskId: 'bbbbccccdddd1111' }) } // Bob's task
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(0);
  });

  test('should throw 400 for invalid request', async () => {
    const res = await axios.get('api/tasks', {
      params: { filter: JSON.stringify({ invalid: 'invalid' }) }
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Bad filter.');
  });
});

test('report', async () => {
  const { taskId, emitter } = await apiTest.taskManager.register(
    { body: null } as any,
    { name: 'Dummy', userEmail: 'alice@example.com' }
  );
  emitter.emit('progress', 'Working!');

  const res = await axios.get('api/tasks/report', { responseType: 'stream' });
  const stream = res.data as Readable;
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch('text/event-stream');

  const streamFinish = readFromStream(stream);
  const data = await streamFinish();
  expect(data).toMatch(taskId);
  expect(data).toMatch('Working!');
  emitter.emit('finish');
});

describe('download', () => {
  test('Returns 401 for unauthorized task', async () => {
    const res = await axios.get('api/tasks/bbbbccccdddd1111/download'); //Bob's task
    expect(res.status).toBe(401);
  });
  test('Returns 400 when task has no downloadable file', async () => {
    const res = await axios.get('api/tasks/aaaabbbbcccc1111/download');
    expect(res.status).toBe(400);
  });
  test('Returns 409 when a task is still in progress', async () => {
    const res = await axios.get('api/tasks/aaaabbbbcccc3333/download');
    expect(res.status).toBe(409);
  });
});
