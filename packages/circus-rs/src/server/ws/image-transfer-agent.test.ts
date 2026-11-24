import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Logger } from '@utrad-ical/circus-lib';
import RawData from '../../common/RawData.ts';
import type { VolumeAccessor } from '../helper/createVolumeProvider.ts';
import createImageTransferAgent from './image-transfer-agent.ts';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const logger = { error: () => {} } as unknown as Logger;

const fakeAccessor = (count: number): VolumeAccessor => ({
  imageMetadata: new Map(),
  volume: new RawData([2, 2, count], 'int16'),
  load: async () => {},
  zIndices: new Map(),
  determinePitch: async () => 1,
  images: [[1, count]],
  isLike3d: async () => true
});

/** Counts the setImmediate calls, which the transfer loop uses */
const countImmediates = async (ms: number) => {
  const original = globalThis.setImmediate;
  let count = 0;
  globalThis.setImmediate = ((fn: any, ...args: any[]) => {
    count++;
    return original(fn, ...args);
  }) as typeof setImmediate;
  try {
    await wait(ms);
  } finally {
    globalThis.setImmediate = original;
  }
  return count;
};

test('stops the loop while all transfers are paused', async () => {
  const sent: number[] = [];
  let release: () => void = () => {};
  const blocked = new Promise<void>(resolve => (release = resolve));
  const agent = createImageTransferAgent({
    imageDataEmitter: async data => {
      sent.push(data.imageIndex);
      await blocked;
    },
    volumeProvider: async () => fakeAccessor(100),
    errorEmitter: async () => {},
    logger
  });
  const connection = (await agent.beginTransfer('t1', 'uid'))!;
  connection.pause();
  release();
  await wait(10);
  const sentWhilePaused = sent.length;
  assert.ok(sentWhilePaused <= 1);
  assert.equal(await countImmediates(30), 0);

  connection.resume();
  await wait(30);
  assert.ok(sent.length > sentWhilePaused);
  agent.dispose();
});

test('does not start a transfer prepared after dispose', async () => {
  const sent: number[] = [];
  let provide: (accessor: VolumeAccessor) => void = () => {};
  const agent = createImageTransferAgent({
    imageDataEmitter: async data => void sent.push(data.imageIndex),
    volumeProvider: () => new Promise(resolve => (provide = resolve)),
    errorEmitter: async () => {},
    logger
  });
  const begun = agent.beginTransfer('t1', 'uid');
  await wait(5);
  agent.dispose();
  provide(fakeAccessor(3));
  assert.equal(await begun, null);
  assert.equal(await agent.getConnection('t1'), null);
  await wait(10);
  assert.deepEqual(sent, []);
});

test('forgets a transfer whose series failed to load', async () => {
  const agent = createImageTransferAgent({
    imageDataEmitter: async () => {},
    volumeProvider: async () => {
      throw new Error('Not found');
    },
    errorEmitter: async () => {},
    logger
  });
  await assert.rejects(agent.beginTransfer('t1', 'uid'), /Not found/);
  assert.equal(await agent.getConnection('t1'), null);
});

test('tells the client why a transfer failed', async () => {
  const errors: [string, string][] = [];
  const failingAccessor = (err: Error): VolumeAccessor => ({
    ...fakeAccessor(3),
    load: async () => {
      throw err;
    }
  });
  const run = async (transferId: string, err: Error) => {
    const agent = createImageTransferAgent({
      imageDataEmitter: async () => {},
      errorEmitter: async (id, message) => void errors.push([id, message]),
      volumeProvider: async () => failingAccessor(err),
      logger
    });
    await agent.beginTransfer(transferId, 'uid');
    await wait(20);
    agent.dispose();
  };
  await run(
    't1',
    Object.assign(new Error('Image #2 is 1x1'), { expose: true })
  );
  await run('t2', new Error('ENOENT: /secret/path'));
  assert.deepEqual(errors, [
    ['t1', 'Image #2 is 1x1'],
    ['t2', 'Failed to load the series.']
  ]);
});

test('tells the client when a series cannot be loaded', async () => {
  const errors: string[] = [];
  const agent = createImageTransferAgent({
    imageDataEmitter: async () => {},
    errorEmitter: async (_id, message) => void errors.push(message),
    volumeProvider: async () => {
      throw Object.assign(new Error('Series not found.'), { expose: true });
    },
    logger
  });
  await assert.rejects(agent.beginTransfer('t1', 'uid'));
  assert.deepEqual(errors, ['Series not found.']);
});

test('does not leave a failure in a partial volume unhandled', async () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const errors: string[] = [];
    const agent = createImageTransferAgent({
      imageDataEmitter: async () => {},
      errorEmitter: async (_id, message) => void errors.push(message),
      volumeProvider: async () => ({
        ...fakeAccessor(3),
        load: async () => {
          throw Object.assign(new Error('Broken'), { expose: true });
        }
      }),
      logger
    });
    await agent.beginTransfer('t1', 'uid', { start: 1, end: 3, delta: 1 });
    await wait(20);
    agent.dispose();
    assert.deepEqual(errors, ['Broken']);
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('passes a priority to the loader for all the images at once', async () => {
  const loads: [number[], number | undefined][] = [];
  const agent = createImageTransferAgent({
    imageDataEmitter: async () => {},
    errorEmitter: async () => {},
    volumeProvider: async () => ({
      ...fakeAccessor(10),
      load: async (range: any, priority?: number) =>
        void loads.push([[range].flat(), priority])
    }),
    logger
  });
  const connection = (await agent.beginTransfer('t1', 'uid'))!;
  connection.pause();
  connection.setPriority([5, 6, 7], 3);
  // z indexes 5-7 are images #6-#8
  assert.ok(loads.some(([nos, p]) => p === 3 && nos.join() === '6,7,8'));
  agent.dispose();
});
