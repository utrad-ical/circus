import assert from 'node:assert/strict';
import { describe, test, it, before, after } from 'node:test';
import type { RsServices } from './configureServiceLoader.ts';
import configureServiceLoader from './configureServiceLoader.ts';
import fs from 'fs';
import zlib from 'zlib';
import _axios from 'axios';
import type { Server } from 'http';
import { ServiceLoader } from '@utrad-ical/circus-lib';
import status from 'http-status';
import type { Configuration } from './Configuration.ts';
import path from 'path';

const port = 1024;

const testConfig = () =>
  ({
    rsServer: {
      options: { port, globalIpFilter: '(^|:?)127.0.0.1$|(^|:?)::1$' }
    },
    rsLogger: { type: 'NullLogger' },
    dicomFileRepository: { type: 'MemoryDicomFileRepository', options: {} },
    imageEncoder: { type: 'PngJsImageEncoder', options: {} },
    volumeProvider: { options: { cache: { memoryThreshold: 2147483648 } } }
  }) as Configuration;

const axios = _axios.create({
  baseURL: `http://localhost:${port}`,
  validateStatus: () => true
});

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

  // Fill mock images to dicom file repository
  const dicomFileRepository = await loader.get('dicomFileRepository');
  const series = await dicomFileRepository.getSeries('1.2.3.4.5');
  const image = await dicomImage();
  for (let i = 1; i <= 20; i++) await series.save(i, image);

  // Start app
  const app = await loader.get('rsServer');
  app.proxy = true;
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
    const res = await axios.get('/status');
    assert.equal(res.status, status.OK);
    assert.ok(res.headers['content-type'].includes('application/json'));
    assert.partialDeepStrictEqual(res.data, { status: 'Running' });
  });

  test('globalIpFilter', async () => {
    const res = await axios.get('/status', {
      headers: { 'X-Forwarded-For': '127.0.0.11 ' }
    });
    assert.equal(res.status, status.UNAUTHORIZED);
  });

  test('must return 404 for nonexistent route', async () => {
    const res = await axios.get('/foobar');
    assert.equal(res.status, status.NOT_FOUND);
  });

  describe('series middleware', () => {
    test('CORS headers', async () => {
      const res = await axios.request({
        method: 'options',
        url: '/series/1.2.3.4.5/metadata'
      });
      assert.equal(res.headers['access-control-allow-methods'], 'GET');
    });

    // it.skip('must return 404 for nonexistent series');

    describe('metadata', () => {
      test('returns no window by default', async () => {
        const res = await axios.get('/series/1.2.3.4.5/metadata');
        assert.equal(res.status, status.OK);
        assert.equal(res.data.estimatedWindow, undefined);
      });

      test('returns no window if window=none', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?estimateWindow=none'
        );
        assert.equal(res.status, status.OK);
        assert.equal(res.data.estimatedWindow, undefined);
      });

      test('returns estimated window with window=first', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?estimateWindow=first'
        );
        assert.equal(res.status, status.OK);
        assert.partialDeepStrictEqual(res.data.estimatedWindow, {
          level: 192,
          width: 2498
        });
      });

      test('returns estimated window with window=center', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?estimateWindow=center'
        );
        assert.equal(res.status, status.OK);
        assert.partialDeepStrictEqual(res.data.estimatedWindow, {
          level: 192,
          width: 2498
        });
      });

      it('returns estimated window with window=full', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?estimateWindow=full'
        );
        assert.equal(res.status, status.OK);
        assert.partialDeepStrictEqual(res.data.estimatedWindow, {
          level: 192,
          width: 2498
        });
      });

      test('returns partial metadata', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?start=5&end=15&delta=2'
        );
        assert.equal(res.status, status.OK);
        // 6 slices (5, 7, 9, 11, 13, 15)
        assert.deepEqual(res.data.voxelCount, [512, 512, 6]);
      });
    });

    describe('volume', () => {
      test('returns raw volume', async () => {
        const res = await axios.get('/series/1.2.3.4.5/volume');
        assert.equal(res.status, status.OK);
        assert.equal(res.headers['content-type'], 'application/octet-stream');
        assert.equal(res.headers['content-length'], String(512 * 512 * 20 * 2));
      });

      test('returns partial volume', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/volume?start=5&end=15&delta=2'
        );
        assert.equal(res.status, status.OK);
        assert.equal(res.headers['content-type'], 'application/octet-stream');
        assert.equal(res.headers['content-length'], String(512 * 512 * 6 * 2));
      });
    });

    describe('scan', () => {
      test('return oblique image in binary format', async () => {
        const res = await axios.get('/series/1.2.3.4.5/scan', {
          params: {
            origin: '200,200,50',
            xAxis: '512,0,0',
            yAxis: '0,512,0',
            size: '50,50'
          }
        });
        assert.equal(res.status, status.OK);
        assert.equal(res.headers['content-type'], 'application/octet-stream');
      });

      test('return oblique image from partial volume', async () => {
        const res = await axios.get('/series/1.2.3.4.5/scan', {
          params: {
            start: 5,
            end: 15,
            delta: 2,
            origin: '200,200,50',
            xAxis: '512,0,0',
            yAxis: '0,512,0',
            size: '50,50'
          }
        });
        assert.equal(res.status, status.OK);
        assert.equal(res.headers['content-type'], 'application/octet-stream');
      });

      it('return oblique image in PNG', async () => {
        const res = await axios.get('/series/1.2.3.4.5/scan', {
          params: {
            origin: '200,200,50',
            xAxis: '512,0,0',
            yAxis: '0,512,0',
            size: '50,50',
            format: 'png',
            ww: 50,
            wl: 50
          }
        });
        assert.equal(res.status, status.OK);
        assert.equal(res.headers['content-type'], 'image/png');
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

  let tokenHeader: { Authorization: string };

  test('reject token request from invalid IP', async () => {
    const res = await axios.get('/token', {
      headers: { 'X-Forwarded-For': '127.0.0.2' }
    });
    assert.equal(res.status, status.UNAUTHORIZED);
  });

  test('issue valid token', async () => {
    const res = await axios.get('/token', {
      params: { series: '1.2.3.4.5' }
    });
    assert.equal(res.status, status.OK);
    assert.partialDeepStrictEqual(res.data, { result: 'OK' });
    tokenHeader = { Authorization: `Bearer ${res.data.token}` };
  });

  test('return error if token not passed', async () => {
    const res = await axios.get('/series/1.2.3.4.5/metadata');
    assert.equal(res.status, status.UNAUTHORIZED);
  });

  test('return error for unmatched token', async () => {
    const res = await axios.get('/series/8.8.8.8.8/metadata', {
      headers: tokenHeader
    });
    assert.equal(res.status, status.UNAUTHORIZED);
  });

  test('return content for valid token', async () => {
    const res = await axios.get('/series/1.2.3.4.5/metadata', {
      headers: tokenHeader
    });
    assert.equal(res.status, status.OK);
  });
});
