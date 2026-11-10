import assert from 'node:assert/strict';
import { describe, test, before, after } from 'node:test';
import type { AxiosInstance } from 'axios';
import type { Readable } from 'form-data';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import { readFromStream } from '../../test/util-stream.ts';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
after(async () => await apiTest.tearDown());

describe('search', () => {
  test('should return the list of tasks of the user', async () => {
    const res = await axios.get('api/tasks');
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 4);
  });

  test('search with taskId', async () => {
    const res = await axios.get('api/tasks', {
      params: { filter: JSON.stringify({ taskId: 'aaaabbbbcccc1111' }) }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].name, 'Importing DICOM files');
  });

  test('should not show tasks of other user in search results', async () => {
    const res = await axios.get('api/tasks', {
      params: { filter: JSON.stringify({ taskId: 'bbbbccccdddd1111' }) } // Bob's task
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 0);
  });

  test('should throw 400 for invalid request', async () => {
    const res = await axios.get('api/tasks', {
      params: { filter: JSON.stringify({ invalid: 'invalid' }) }
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Bad filter.');
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
  assert.equal(res.status, 200);
  assert.ok(res.headers['content-type'].includes('text/event-stream'));

  const streamFinish = readFromStream(stream);
  const data = await streamFinish();
  assert.ok(data.includes(taskId));
  assert.ok(data.includes('Starting the task'));
  emitter.emit('finish');
});

describe('get', () => {
  test('Returns task info', async () => {
    const res = await axios.get('api/tasks/aaaabbbbcccc1111');
    assert.equal(res.status, 200);
  });
  test('Returns 401 for unauthorized task', async () => {
    const res = await axios.get('api/tasks/bbbbccccdddd1111'); // Bob's
    assert.equal(res.status, 401);
  });
});

describe('download', () => {
  test('Returns 401 for unauthorized task', async () => {
    const res = await axios.get('api/tasks/bbbbccccdddd1111/download'); // Bob's
    assert.equal(res.status, 401);
  });
  test('Returns 400 when task has no downloadable file', async () => {
    const res = await axios.get('api/tasks/aaaabbbbcccc1111/download');
    assert.equal(res.status, 400);
  });
  test('Returns 409 when a task is still in progress', async () => {
    const res = await axios.get('api/tasks/aaaabbbbcccc3333/download');
    assert.equal(res.status, 409);
  });
  test('Return 404 when download file is not existence', async () => {
    const res = await axios.get('api/tasks/aaaabbbbcccc4444/download');
    assert.equal(res.status, 404);
  });
});
