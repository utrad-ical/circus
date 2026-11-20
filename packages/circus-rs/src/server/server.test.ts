import assert from 'node:assert/strict';
import { describe, test, before, after } from 'node:test';
import type { RsServices } from './configureServiceLoader.ts';
import configureServiceLoader from './configureServiceLoader.ts';
import fs from 'fs';
import zlib from 'zlib';
import RsHttpClient from '../browser/http-client/RsHttpClient.ts';
import { get } from 'node:http';
import type { Server } from 'node:http';
import { createNullLogger, ServiceLoader } from '@utrad-ical/circus-lib';
import status from 'http-status';
import type { Configuration } from './Configuration.ts';
import path from 'path';

const port = 1024;

const testConfig = () =>
  ({
    rsServer: {
      options: { port, globalIpFilter: '(^|:?)127.0.0.1$|(^|:?)::1$' }
    },
    dicomFileRepository: { type: 'MemoryDicomFileRepository', options: {} },
    imageEncoder: { type: 'PngJsImageEncoder', options: {} },
    volumeProvider: { options: { cache: { memoryThreshold: 2147483648 } } }
  }) as Configuration;

const origin = `http://localhost:${port}`;
const request = (path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set('Connection', 'close');
  return fetch(new URL(path, origin), { ...init, headers });
};

const statusFromOtherIp = (pathname: string) =>
  new Promise<number | undefined>((resolve, reject) => {
    get(
      {
        hostname: '127.0.0.1',
        port,
        path: pathname,
        localAddress: '127.0.0.2'
      },
      response => {
        response.resume();
        response.once('end', () => resolve(response.statusCode));
      }
    ).once('error', reject);
  });

const readStatus = async (response: Response) => {
  await response.arrayBuffer();
  return response.status;
};

const testdir = path.join(import.meta.dirname, '../../test-data/dicom/');

const dicomImage = (file = 'CT-MONO2-16-brain') => {
  return new Promise<Buffer>(resolve => {
    try {
      const zippedFileContent = fs.readFileSync(testdir + file + '.gz');
      zlib.unzip(zippedFileContent, function (err, fileContent) {
        if (err) throw err;
        resolve(fileContent);
      });
    } catch (err) {
      const fileContent = fs.readFileSync(testdir + file);
      resolve(fileContent);
    }
  });
};

const startTestServer = async (config: any) => {
  const loader = new ServiceLoader<RsServices>(config);
  configureServiceLoader(loader);
  loader.registerFactory('logger', async () => createNullLogger());

  // Fill mock images to dicom file repository
  const dicomFileRepository = await loader.get('dicomFileRepository');
  const series = await dicomFileRepository.getSeries('1.2.3.4.5');
  const image = await dicomImage();
  for (let i = 1; i <= 20; i++) await series.save(i, image);

  // Start app
  const app = await loader.get('rsServer');
  const server = await new Promise<Server>(resolve => {
    const server = app.listen(port);
    server.on('listening', () => resolve(server));
  });

  const stop = async () => {
    await new Promise(resolve => {
      server.on('close', resolve);
      server.close();
    });
    await loader.dispose();
  };

  return stop;
};

describe('without auth', () => {
  let stopServer: Function;
  before(async () => (stopServer = await startTestServer(testConfig())));
  after(() => stopServer());

  test('status', async () => {
    const res = await request('/status');
    assert.equal(res.status, status.OK);
    assert.ok(res.headers.get('content-type')?.includes('application/json'));
    assert.partialDeepStrictEqual(await res.json(), { status: 'Running' });
  });

  test('globalIpFilter', async () => {
    assert.equal(await statusFromOtherIp('/status'), status.UNAUTHORIZED);
  });

  test('returns 404 for a nonexistent route', async () => {
    const res = await request('/foobar');
    assert.equal(await readStatus(res), status.NOT_FOUND);
  });

  describe('series middleware', () => {
    test('CORS headers', async () => {
      const res = await request('/series/1.2.3.4.5/metadata', {
        method: 'OPTIONS'
      });
      assert.equal(res.status, status.NO_CONTENT);
      assert.equal(res.headers.get('access-control-allow-methods'), 'GET');
    });

    // test.skip('returns 404 for a nonexistent series');

    describe('metadata', () => {
      test('returns no window by default', async () => {
        const res = await request('/series/1.2.3.4.5/metadata');
        assert.equal(res.status, status.OK);
        assert.equal((await res.json()).estimatedWindow, undefined);
      });

      test('returns no window if window=none', async () => {
        const res = await request(
          '/series/1.2.3.4.5/metadata?estimateWindow=none'
        );
        assert.equal(res.status, status.OK);
        assert.equal((await res.json()).estimatedWindow, undefined);
      });

      test('returns estimated window with window=first', async () => {
        const res = await request(
          '/series/1.2.3.4.5/metadata?estimateWindow=first'
        );
        assert.equal(res.status, status.OK);
        assert.partialDeepStrictEqual((await res.json()).estimatedWindow, {
          level: 192,
          width: 2498
        });
      });

      test('returns estimated window with window=center', async () => {
        const res = await request(
          '/series/1.2.3.4.5/metadata?estimateWindow=center'
        );
        assert.equal(res.status, status.OK);
        assert.partialDeepStrictEqual((await res.json()).estimatedWindow, {
          level: 192,
          width: 2498
        });
      });

      test('estimates the window when window is set to full', async () => {
        const res = await request(
          '/series/1.2.3.4.5/metadata?estimateWindow=full'
        );
        assert.equal(res.status, status.OK);
        assert.partialDeepStrictEqual((await res.json()).estimatedWindow, {
          level: 192,
          width: 2498
        });
      });

      test('returns partial metadata', async () => {
        const res = await request(
          '/series/1.2.3.4.5/metadata?start=5&end=15&delta=2'
        );
        assert.equal(res.status, status.OK);
        // 6 slices (5, 7, 9, 11, 13, 15)
        assert.deepEqual((await res.json()).voxelCount, [512, 512, 6]);
      });
    });

    describe('volume', () => {
      test('returns raw volume', async () => {
        const res = await request('/series/1.2.3.4.5/volume');
        assert.equal(res.status, status.OK);
        assert.equal(
          res.headers.get('content-type'),
          'application/octet-stream'
        );
        assert.equal(
          res.headers.get('content-length'),
          String(512 * 512 * 20 * 2)
        );
        assert.equal((await res.arrayBuffer()).byteLength, 512 * 512 * 20 * 2);
      });

      test('returns partial volume', async () => {
        const res = await request(
          '/series/1.2.3.4.5/volume?start=5&end=15&delta=2'
        );
        assert.equal(res.status, status.OK);
        assert.equal(
          res.headers.get('content-type'),
          'application/octet-stream'
        );
        assert.equal(
          res.headers.get('content-length'),
          String(512 * 512 * 6 * 2)
        );
        assert.equal((await res.arrayBuffer()).byteLength, 512 * 512 * 6 * 2);
      });

      test('rejects partial volume out of the image range', async () => {
        const res1 = await request(
          '/series/1.2.3.4.5/volume?start=5&end=21&delta=1'
        );
        assert.equal(await readStatus(res1), status.BAD_REQUEST);
        const res2 = await request(
          '/series/1.2.3.4.5/volume?start=25&end=15&delta=-1'
        );
        assert.equal(await readStatus(res2), status.BAD_REQUEST);
      });
    });

    describe('scan', () => {
      test('returns an oblique image in binary format', async () => {
        const res = await request(
          '/series/1.2.3.4.5/scan?' +
            new URLSearchParams({
              origin: '200,200,50',
              xAxis: '512,0,0',
              yAxis: '0,512,0',
              size: '50,50'
            })
        );
        assert.equal(res.status, status.OK);
        assert.equal(
          res.headers.get('content-type'),
          'application/octet-stream'
        );
        assert.ok((await res.arrayBuffer()).byteLength > 0);
      });

      test('returns an oblique image from a partial volume', async () => {
        const res = await request(
          '/series/1.2.3.4.5/scan?' +
            new URLSearchParams({
              start: '5',
              end: '15',
              delta: '2',
              origin: '200,200,50',
              xAxis: '512,0,0',
              yAxis: '0,512,0',
              size: '50,50'
            })
        );
        assert.equal(res.status, status.OK);
        assert.equal(
          res.headers.get('content-type'),
          'application/octet-stream'
        );
        assert.ok((await res.arrayBuffer()).byteLength > 0);
      });

      test('returns an oblique image as PNG', async () => {
        const res = await request(
          '/series/1.2.3.4.5/scan?' +
            new URLSearchParams({
              origin: '200,200,50',
              xAxis: '512,0,0',
              yAxis: '0,512,0',
              size: '50,50',
              format: 'png',
              ww: '50',
              wl: '50'
            })
        );
        assert.equal(res.status, status.OK);
        assert.equal(res.headers.get('content-type'), 'image/png');
        assert.ok((await res.arrayBuffer()).byteLength > 0);
      });
    });
  });
});

describe('with authentication', () => {
  let stopServer: Function;
  before(async () => {
    const config = testConfig();
    config.rsServer!.options!.authorization = {
      enabled: true,
      tokenRequestIpFilter: '(^|:?)127.0.0.1$|(^|:?)::1$',
      expire: 1800
    };
    stopServer = await startTestServer(config);
  });
  after(() => stopServer());

  let token: string;
  let tokenHeader: { Authorization: string };

  test('rejects token requests from disallowed IP addresses', async () => {
    assert.equal(await statusFromOtherIp('/token'), status.UNAUTHORIZED);
  });

  test('issues a token for the requested series', async () => {
    const res = await request('/token?series=1.2.3.4.5');
    assert.equal(res.status, status.OK);
    const data = await res.json();
    assert.partialDeepStrictEqual(data, { result: 'OK' });
    token = data.token;
    tokenHeader = { Authorization: `Bearer ${token}` };
  });

  test('returns 401 when the token is missing', async () => {
    const res = await request('/series/1.2.3.4.5/metadata');
    assert.equal(await readStatus(res), status.UNAUTHORIZED);
  });

  test('returns 401 when the token is for another series', async () => {
    const res = await request('/series/8.8.8.8.8/metadata', {
      headers: tokenHeader
    });
    assert.equal(await readStatus(res), status.UNAUTHORIZED);
  });

  test('returns 200 for a valid token', async () => {
    const res = await request('/series/1.2.3.4.5/metadata', {
      headers: tokenHeader
    });
    assert.equal(await readStatus(res), status.OK);
  });

  test('browser HTTP client uses the bearer token and decodes volume data', async () => {
    const client = new RsHttpClient(origin, token);
    const metadata = await client.request('series/1.2.3.4.5/metadata', {
      start: 5,
      end: 15,
      delta: 2,
      estimateWindow: undefined
    });
    assert.deepEqual(metadata.voxelCount, [512, 512, 6]);
    const volume = await client.request(
      'series/1.2.3.4.5/volume',
      {},
      'arraybuffer'
    );
    assert.ok(volume instanceof ArrayBuffer);
    assert.equal(volume.byteLength, 512 * 512 * 20 * 2);

    await assert.rejects(
      new RsHttpClient(origin).request('series/1.2.3.4.5/metadata', {}),
      error => {
        const { response } = error as { response?: { status: number } };
        return response?.status === status.UNAUTHORIZED;
      }
    );
  });

  test('browser HTTP client accepts a signal that is already aborted', async () => {
    const client = new RsHttpClient(origin, token);
    const signal = AbortSignal.abort();
    await assert.rejects(
      client.request('series/1.2.3.4.5/metadata', {}, 'json', signal),
      { name: 'AbortError' }
    );
  });
});
