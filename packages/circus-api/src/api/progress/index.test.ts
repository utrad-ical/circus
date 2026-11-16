import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Readable } from 'node:stream';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import {
  readFromStream,
  readFromStreamTillEnd
} from '../../test/util-stream.ts';

let apiTest: ApiTest;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
});
after(async () => await apiTest.tearDown());

const issue = async () => {
  const res = await apiTest.axiosInstances.alice.post('api/progress', {});
  assert.equal(res.status, 201);
  return res.data.progressId as string;
};

const subscribe = (progressId: string) =>
  apiTest.axiosInstances.alice.get(`api/progress/${progressId}`, {
    responseType: 'stream'
  });

describe('progress', () => {
  test('reports progress until the end', async () => {
    const progressId = await issue();
    const res = await subscribe(progressId);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/event-stream/);
    const data = readFromStreamTillEnd(res.data as Readable);
    const reporter = apiTest.progressManager.claim(
      progressId,
      'alice@example.com'
    );
    reporter.report('Working', 1, 3);
    reporter.report('Working', 2, 3); // throttled, then dropped by finish
    reporter.finish('Done');
    assert.equal(
      await data,
      '\n' +
        'event: progress\ndata: {"message":"Working","finished":1,"total":3}\n\n' +
        'event: finish\ndata: {"message":"Done"}\n\n'
    );
  });

  test('replays the last event to a late subscriber', async () => {
    const progressId = await issue();
    const reporter = apiTest.progressManager.claim(
      progressId,
      'alice@example.com'
    );
    reporter.fail('Something went wrong');
    const res = await subscribe(progressId);
    assert.equal(
      await readFromStreamTillEnd(res.data as Readable),
      '\nevent: error\ndata: {"message":"Something went wrong"}\n\n'
    );
  });

  test('sends log lines together, before the end', async () => {
    const progressId = await issue();
    const res = await subscribe(progressId);
    const data = readFromStreamTillEnd(res.data as Readable);
    const reporter = apiTest.progressManager.claim(
      progressId,
      'alice@example.com'
    );
    reporter.log('info', 'A');
    reporter.log('warn', 'B'); // sent with C after the interval
    reporter.log('error', 'C');
    reporter.finish('Done');
    assert.equal(
      await data,
      '\n' +
        'event: log\ndata: {"lines":[{"level":"info","message":"A"}]}\n\n' +
        'event: log\ndata: {"lines":[{"level":"warn","message":"B"},{"level":"error","message":"C"}]}\n\n' +
        'event: finish\ndata: {"message":"Done"}\n\n'
    );
  });

  test('replays recent log lines to a late subscriber', async () => {
    const progressId = await issue();
    const reporter = apiTest.progressManager.claim(
      progressId,
      'alice@example.com'
    );
    for (let i = 1; i <= 105; i++) reporter.log('info', `#${i}`);
    reporter.finish('Done');
    const res = await subscribe(progressId);
    const text = await readFromStreamTillEnd(res.data as Readable);
    const lines = JSON.parse(/event: log\ndata: (.*)\n/.exec(text)![1]).lines;
    assert.equal(lines.length, 100);
    assert.equal(lines[0].message, '#6');
    assert.match(text, /event: finish/);
  });

  test('keeps the connection before the request starts', async () => {
    const progressId = await issue();
    const res = await subscribe(progressId);
    assert.equal(await readFromStream(res.data as Readable)(), '\n');
  });

  test('returns 404 for an unknown ID or for other users', async () => {
    const progressId = await issue();
    const res1 = await apiTest.axiosInstances.alice.get('api/progress/abc');
    assert.equal(res1.status, 404);
    const res2 = await apiTest.axiosInstances.bob.get(
      `api/progress/${progressId}`
    );
    assert.equal(res2.status, 404);
  });
});
