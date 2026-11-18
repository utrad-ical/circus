import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createStdoutLogger, ServiceLoader } from '@utrad-ical/circus-lib';
import type { RsServices } from '@utrad-ical/circus-rs/server';
import { configureRsServiceLoader } from '@utrad-ical/circus-rs/server';
import { Hono } from 'hono';
import { httpError } from './errorHandler.ts';
import { createHonoApp } from '../createHonoApp.ts';
import type { TestHttpClient } from '../test/util-http.ts';
import { createTestHttpClient } from '../test/util-http.ts';
import { ValidationError } from '../createValidator.ts';
import type { TestServer } from '../test/util-server.ts';
import { setUpHonoTest } from '../test/util-server.ts';

let testServer: TestServer, ax: TestHttpClient;

before(async () => {
  testServer = await setUpHonoTest(
    async app => {
      app.get('/found', ctx => ctx.text('Hello'));

      const validationError = (phase: 'request' | 'response') => {
        const err = new ValidationError([
          { path: ['a'], message: 'Expected number', code: 'invalid_type' }
        ]);
        err.phase = phase;
        return err;
      };

      app.get('/invalid-on-request', () => {
        throw validationError('request');
      });

      app.get('/invalid-on-response', () => {
        throw validationError('response');
      });

      app.get('/server-side-error', async ctx => {
        return ctx.text((null as any).foo); // intentional run time error
      });

      app.get('/error-403', () => {
        throw httpError(403, 'no!');
      });
    },
    { debug: true }
  );
  ax = createTestHttpClient(testServer.url);
});

after(async () => {
  await testServer.tearDown();
});

test('should return 200 for normal request', async () => {
  const res = await ax.get('found');
  assert.equal(res.status, 200);
});

test('should return 404 for nonexistent path', async () => {
  const res = await ax.get('not-found');
  assert.equal(res.status, 404);
});

test('should return 400 for request validation error', async () => {
  const res = await ax.get('invalid-on-request');
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Validation failed.');
  assert.deepEqual(res.data.issues, [
    { path: ['a'], message: 'Expected number' }
  ]);
});

test('should return 500 for server-side validation error', async () => {
  const res = await ax.get('invalid-on-response');
  assert.equal(res.status, 500);
  assert.match(res.data.error, /response schema validation error/i);
});

test('logs the route template and issue codes for invalid responses', async () => {
  const lines: string[] = [];
  const logger = createStdoutLogger('api', 'info', {
    write: line => lines.push(line)
  });
  const app = createHonoApp({ logger });
  app.get('/api/examples/:id', () => {
    const error = new ValidationError([
      {
        path: ['dynamic-key'],
        message: 'Invalid value: example payload',
        code: 'invalid_type'
      }
    ]);
    error.phase = 'response';
    throw error;
  });

  const res = await app.request('/api/examples/example-id');
  assert.equal(res.status, 500);
  const [error, access] = lines.map(line => JSON.parse(line));
  const requestId = res.headers.get('X-Request-Id');
  assert.ok(requestId);
  assert.equal(lines.length, 2);
  assert.partialDeepStrictEqual(error, {
    msg: 'Response schema validation error detected.',
    method: 'GET',
    route: '/api/examples/:id',
    requestId,
    phase: 'response',
    issueCodes: ['invalid_type']
  });
  assert.partialDeepStrictEqual(access, {
    msg: 'HTTP request completed',
    requestId,
    status: 500
  });
  assert.doesNotMatch(lines.join(''), /example-id|dynamic-key|example payload/);
});

test('logs API and embedded RS requests once without raw request data', async () => {
  const lines: string[] = [];
  const logger = createStdoutLogger('api', 'debug', {
    write: line => lines.push(line)
  });
  const app = createHonoApp({ logger });
  app.get('/api/examples/:id', ctx => ctx.text('Hello'));
  const rs = new Hono();
  rs.get('/:sid/volume', () => {
    throw httpError(401, 'not authenticated');
  });
  app.route('/rs/series', rs);

  for (const [path, route, status, component] of [
    ['/api/examples/private-id', '/api/examples/:id', 200, undefined],
    ['/rs/series/private-id/volume', '/rs/series/:sid/volume', 401, 'rs'],
    ['/api/private-id', null, 404, undefined]
  ] as const) {
    const response = await app.request(path + '?token=private-query', {
      headers: {
        Authorization: 'Bearer private-token',
        'X-Request-Id': 'private-header'
      }
    });
    assert.equal(response.status, status);
    assert.equal(lines.length, 1);
    assert.doesNotMatch(lines[0], /private-/);
    const access = JSON.parse(lines.pop()!);
    assert.partialDeepStrictEqual(access, {
      msg: 'HTTP request completed',
      requestId: response.headers.get('X-Request-Id'),
      route,
      status
    });
    assert.match(access.requestId, /^[a-f0-9-]{36}$/);
    assert.equal(access.component, component);
    assert.equal(access.level, component === 'rs' ? 20 : 30);
    assert.ok(access.durationMs >= 0);
  }
});

test('logs the executed export route and sets the ID on raw responses', async () => {
  const lines: string[] = [];
  const logger = createStdoutLogger('api', 'info', {
    write: line => lines.push(line)
  });
  const app = createHonoApp({ logger });
  const exportRoutes = [
    ['/api/cases/export-mhd', '/api/cases/:caseId'],
    ['/api/series/export-cs-volume', '/api/series/:seriesUid']
  ] as const;
  for (const [path, parameterized] of exportRoutes) {
    app.get(path, () => new Response('export'));
    app.get(parameterized, ctx => ctx.text('fallback'));
  }
  for (const [path] of exportRoutes) {
    const response = await app.request(path);
    assert.equal(await response.text(), 'export');
    const requestId = response.headers.get('X-Request-Id');
    assert.ok(requestId);
    assert.partialDeepStrictEqual(JSON.parse(lines.shift()!), {
      requestId,
      route: path,
      status: 200
    });
  }
});

test('keeps embedded RS server errors visible at info', async () => {
  const lines: string[] = [];
  const logger = createStdoutLogger('api', 'info', {
    write: line => lines.push(line)
  });
  const app = createHonoApp({ logger });
  app.get('/rs/ready', ctx => ctx.text('ready'));
  app.get('/rs/unavailable', ctx => ctx.text('unavailable', 503));
  assert.equal((await app.request('/rs/ready')).status, 200);
  assert.equal(lines.length, 0);
  assert.equal((await app.request('/rs/unavailable')).status, 503);
  assert.equal(lines.length, 1);
  assert.partialDeepStrictEqual(JSON.parse(lines[0]), {
    component: 'rs',
    level: 50,
    route: '/rs/unavailable',
    status: 503
  });
});

test('correlates embedded RS volume load failures with the HTTP request', async () => {
  const lines: string[] = [];
  const logger = createStdoutLogger('api', 'debug', {
    write: line => lines.push(line)
  });
  const loader = new ServiceLoader<RsServices>();
  configureRsServiceLoader(loader);
  loader.registerFactory('logger', async () => logger);
  loader.registerFactory('volumeProvider', async () => async () => {
    throw new Error('Synthetic volume load failure');
  });
  const app = createHonoApp({ logger });
  const rsSeriesRoutes = await loader.get('rsSeriesRoutes');
  app.route('/rs/series', rsSeriesRoutes());
  const response = await app.request('/rs/series/1.2.3.4/volume');
  assert.equal(response.status, 404);
  const requestId = response.headers.get('X-Request-Id');
  assert.ok(requestId);
  assert.equal(lines.length, 2);
  const [failure, access] = lines.map(line => JSON.parse(line));
  assert.partialDeepStrictEqual(failure, {
    component: 'rs',
    requestId,
    msg: 'Failed to load RS volume'
  });
  assert.partialDeepStrictEqual(access, {
    component: 'rs',
    requestId,
    route: '/rs/series/:sid/volume',
    status: 404
  });
  assert.doesNotMatch(lines.join(''), /Synthetic volume load failure/);
});

test('should return 500 for server-side run-time error', async () => {
  const res = await ax.get('server-side-error');
  assert.equal(res.status, 500);
  assert.ok('stack' in res.data);
});

test('should return 403 for server-side access error', async () => {
  const res = await ax.get('error-403');
  assert.equal(res.status, 403);
  assert.match(res.data.error, /no!/);
});
