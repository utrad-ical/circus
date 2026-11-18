import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ServiceLoader from '../ServiceLoader.ts';
import type Logger from './Logger.ts';
import createStdoutLogger from './StdoutLogger.ts';
import { createLoggerFactory } from './createLoggerFactory.ts';

test('writes a line of structured JSON and omits error headlines', () => {
  const lines: string[] = [];
  const logger = createStdoutLogger('api', 'info', {
    write: line => lines.push(line)
  });
  const child = logger.child({ component: 'rs' });
  child.debug('Filtered');
  child.error(
    {
      err: new TypeError(
        'Synthetic private detail\n    at fake (node:private-detail:1:2)'
      )
    },
    'RS failed'
  );

  assert.equal(lines.length, 1);
  assert.equal(lines[0].split('\n').length, 2);
  assert.doesNotMatch(lines[0], /private[ -]detail|Filtered/);
  const entry = JSON.parse(lines[0]);
  assert.partialDeepStrictEqual(entry, {
    service: 'api',
    component: 'rs',
    msg: 'RS failed',
    err: { type: 'TypeError' }
  });
  assert.match(entry.time, /Z$/);
  assert.match(entry.err.stack, /at /);
});

test('keeps stack locations when the error headline differs from its name and message', () => {
  const lines: string[] = [];
  const logger = createStdoutLogger('api', 'info', {
    write: line => lines.push(line)
  });
  assert.throws(
    () => readFileSync(null!),
    err => {
      logger.error({ err }, 'Node I/O failed');
      return true;
    }
  );
  const nodeError = JSON.parse(lines[0]).err;
  assert.equal(nodeError.code, 'ERR_INVALID_ARG_TYPE');
  assert.match(nodeError.stack, /StdoutLogger\.test\.ts:\d+:\d+/);

  const err = new Error('Original synthetic message');
  assert.ok(err.stack);
  err.message = 'Updated synthetic message';
  logger.error({ err }, 'Operation failed');
  assert.match(
    JSON.parse(lines[1]).err.stack,
    /StdoutLogger\.test\.ts:\d+:\d+/
  );
  assert.doesNotMatch(lines[1], /synthetic message/);
});

test('ignores logger types, warns once, and applies the configured level', async () => {
  const lines: string[] = [];
  const loader = new ServiceLoader<{ logger: Logger }>({
    apiLogger: { type: './legacy-logger', options: { level: 'error' } }
  });
  loader.registerFactory(
    'logger',
    createLoggerFactory('apiLogger', 'api', (service, level) =>
      createStdoutLogger(service, level, { write: line => lines.push(line) })
    )
  );
  const logger = await loader.get('logger');
  assert.equal(await loader.get('logger'), logger);
  logger.warn('Filtered');
  const rs = logger.child({ component: 'rs' });
  rs.warn('Filtered in RS');
  rs.error('Logged');

  assert.equal(lines.length, 2);
  assert.doesNotMatch(lines.join(''), /legacy-logger|Filtered/);
  assert.partialDeepStrictEqual(JSON.parse(lines[0]), {
    level: 40,
    setting: 'apiLogger.type',
    service: 'api'
  });
  assert.partialDeepStrictEqual(JSON.parse(lines[1]), {
    level: 50,
    msg: 'Logged',
    component: 'rs'
  });
});
