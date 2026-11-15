import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import createProgressManager from './createProgressManager.ts';
import delay from './utils/delay.ts';

describe('createProgressManager', () => {
  test('issues unique IDs', async () => {
    const pm = await createProgressManager({});
    const a = pm.issue('alice@example.com');
    const b = pm.issue('alice@example.com');
    assert.match(a, /^[0-9a-f]{32}$/);
    assert.notEqual(a, b);
  });

  test('claims an ID only once and only by its owner', async () => {
    const pm = await createProgressManager({});
    const id = pm.issue('alice@example.com');
    assert.throws(() => pm.claim('unknown', 'alice@example.com'), {
      status: 400
    });
    assert.throws(() => pm.claim(id, 'bob@example.com'), { status: 400 });
    pm.claim(id, 'alice@example.com');
    assert.throws(() => pm.claim(id, 'alice@example.com'), { status: 400 });
  });

  test('forgets unused IDs', async () => {
    const pm = await createProgressManager({ unclaimedTtlMs: 10 });
    const id = pm.issue('alice@example.com');
    await delay(30);
    assert.throws(() => pm.claim(id, 'alice@example.com'), { status: 400 });
  });
});
