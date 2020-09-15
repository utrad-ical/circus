import { AxiosInstance } from 'axios';
import { Readable } from 'form-data';
import { ApiTest, setUpAppForRoutesTest } from '../../../test/util-routes';
import { readFromStream } from '../../../test/util-stream';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

it('should return the list of tasks of the user', async () => {
  const res = await axios.get('api/tasks');
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(2);
});

it.skip('should return the information of the specified task', async () => {
  const res = await axios.get('api/tasks/alice@example.com');
  expect(res.status).toBe(200);
  expect(res.data.owner).toBe('alice@example.com');
});

it.skip('should return 404 for nonexistent task', async () => {
  const res = await axios.get('api/tasks/aaaabbbbcccc0000');
  expect(res.status).toBe(404);
});

it.skip("should return unauthorized for someone else's task", async () => {
  const res = await axios.get('api/tasks/aaaabbbbcccc2222');
  expect(res.status).toBe(403);
});

test.only('report', async () => {
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
  emitter.emit('finish', 'Finishing this.');
});
