import supertest from 'supertest';
import createServiceLoader, {
  RsServices
} from '../src/server/helper/createServiceLoader';
import fs from 'fs';
import zlib from 'zlib';
import _axios from 'axios';
import adapter from 'axios/lib/adapters/http';
import { Server } from 'http';
import { ServiceLoader } from '@utrad-ical/circus-lib';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';

const port = 1024;

const testConfig = {
  rsServer: { options: { port, globalIpFilter: '(^|:?)127.0.0.1$' } },
  rsLogger: { type: 'NullLogger' },
  dicomFileRepository: { type: 'MemoryDicomFileRepository', options: {} },
  imageEncoder: { type: 'PngJsImageEncoder', options: {} },
  volumeProvider: { options: { cache: { memoryThreshold: 2147483648 } } }
};

const axios = _axios.create({
  baseURL: `http://localhost:${port}`,
  validateStatus: () => true,
  adapter // Makes Axios use Node's http, instead of DOM XHR
});

const testdir = __dirname + '/test-dicom/';
const MOCK_IMAGE_COUNT = 20;

const dicomImage = (file = 'CT-MONO2-16-brain') => {
  return new Promise<Buffer>(resolve => {
    try {
      const zippedFileContent = fs.readFileSync(testdir + file + '.gz');
      zlib.unzip(zippedFileContent, function(err, fileContent) {
        if (err) throw err;
        resolve(fileContent);
      });
    } catch (err) {
      const fileContent = fs.readFileSync(testdir + file);
      resolve(fileContent);
    }
  });
};

const fillMockImages = async (dicomFileRepository: DicomFileRepository) => {
  const series = await dicomFileRepository.getSeries('1.2.3.4.5');
  const image = await dicomImage();
  for (let i = 1; i <= MOCK_IMAGE_COUNT; i++) {
    await series.save(i, image);
  }
};

describe('always', () => {
  /** @type Server */
  let httpServer: Server;
  let loader: ServiceLoader<RsServices>;
  beforeAll(async () => {
    loader = createServiceLoader(testConfig as any);
    const dicomFileRepository = await loader.get('dicomFileRepository');
    await fillMockImages(dicomFileRepository);
    const app = await loader.get('rsServer');
    app.proxy = true;
    await new Promise(resolve => {
      httpServer = app.listen(port);
      httpServer = httpServer.on('listening', resolve);
    });
  });
  afterAll(async () => {
    await new Promise(resolve => {
      httpServer.on('close', resolve);
      httpServer.close();
    });
    await loader.dispose();
  });

  it('must return JSON for status', async () => {
    const res = await axios.get('/status');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch('application/json');
    expect(res.data).toMatchObject({ status: 'Running' });
  });

  it('must reject invalid access using globalIpFilter', function(done: Function) {
    supertest(httpServer)
      .get('/status')
      .set('X-Forwarded-For', '127.0.0.11') // change IP
      .expect(401)
      .end(done);
  });

  it('must return 404 for nonexistent route', function(done: Function) {
    supertest(httpServer)
      .get('/foobar')
      .expect(404)
      .end(done);
  });

  describe('series middleware', function() {
    it('must return valid access-control headers', function(done: Function) {
      supertest(httpServer)
        .options('/series/1.2.3.4.5/metadata')
        .expect((res: any) => {
          const { header } = res;
          if (
            !('access-control-allow-origin' in header) ||
            header['access-control-allow-methods'] !== 'GET'
          )
            throw new Error('Invalid access-control headers');
        })
        .end(done);
    });

    // it.skip('must return 404 for nonexistent series');

    describe('metadata', () => {
      test('return metadata without estimated window by default', async () => {
        const res = await axios.get('/series/1.2.3.4.5/metadata');
        expect(res.status).toBe(200);

        // supertest(httpServer)
        //   .get('/series/1.2.3.4.5/metadata')
        //   .expect(200)
        //   .expect((res: any) => {
        //     if (res.body.estimatedWindow !== undefined)
        //       throw new Error('Invalid implemention');
        //   })
        //   .expect('Content-Type', /application\/json/)
        //   .end(done);
      });

      test('must return metadata without estimated window if estimatedWindow paramator is "none"', function(done: Function) {
        supertest(httpServer)
          .get('/series/1.2.3.4.5/metadata')
          .expect(200)
          .expect((res: any) => {
            if (res.body.estimatedWindow !== undefined)
              throw new Error('Invalid implemention');
          })
          .expect('Content-Type', /application\/json/)
          .end(done);
      });

      it('must return metadata with estimated window which was calculated by "first" algorythm', function(done: Function) {
        supertest(httpServer)
          .get('/series/1.2.3.4.5/metadata?estimateWindow=first')
          .expect(200)
          .expect((res: any) => {
            if (res.body.estimatedWindow === undefined)
              throw new Error('Invalid implemention');
          })
          .expect('Content-Type', /application\/json/)
          .end(done);
      });

      it('must return metadata with estimated window which was calculated by "center" algorythm', function(done: Function) {
        supertest(httpServer)
          .get('/series/1.2.3.4.5/metadata?estimateWindow=center')
          .expect(200)
          .expect((res: any) => {
            if (res.body.estimatedWindow === undefined)
              throw new Error('Invalid implemention');
          })
          .expect('Content-Type', /application\/json/)
          .end(done);
      });

      it('must return metadata with estimated window which was calculated by "full" algorythm', function(done: Function) {
        supertest(httpServer)
          .get('/series/1.2.3.4.5/metadata?estimateWindow=full')
          .expect(200)
          .expect((res: any) => {
            if (res.body.estimatedWindow === undefined)
              throw new Error('Invalid implemention');
          })
          .expect('Content-Type', /application\/json/)
          .end(done);
      });

      it('must return partial metadata', function(done: Function) {
        supertest(httpServer)
          .get('/series/1.2.3.4.5/metadata?start=5&end=15&delta=2')
          .expect(200)
          .expect((res: any) => {
            const { voxelCount } = res.body;
            if (voxelCount[2] !== [5, 7, 9, 11, 13, 15].length)
              throw new Error('Invalid partial metadata');
          })
          .expect('Content-Type', /application\/json/)
          .end(done);
      });
    });

    describe('volume', () => {
      let fullVolumeSize = Infinity;

      it('must return volume', function(done: Function) {
        supertest(httpServer)
          .get('/series/1.2.3.4.5/volume')
          .expect(200)
          .expect((res: any) => (fullVolumeSize = res.header['content-length']))
          .expect('Content-Type', 'application/octet-stream')
          .end(done);
      });

      it('must return partial volume', function(done: Function) {
        supertest(httpServer)
          .get('/series/1.2.3.4.5/volume?start=5&end=15&delta=2')
          .expect(200)
          .expect('Content-Type', 'application/octet-stream')
          .expect((res: any) => {
            const a = res.header['content-length'] / fullVolumeSize;
            const b = [5, 7, 9, 11, 13, 15].length / MOCK_IMAGE_COUNT;
            if (a !== b) throw new Error('Invalid implemention');
          })
          .end(done);
      });
    });

    describe('scan', () => {
      it('must return oblique image in binary format', function(done: Function) {
        const test = supertest(httpServer).get('/series/1.2.3.4.5/scan');
        // if (token) test.set('Authorization', 'Bearer ' + token);
        test
          .query({
            origin: '200,200,50',
            xAxis: '512,0,0',
            yAxis: '0,512,0',
            size: '50,50'
          })
          .expect(200)
          .expect('Content-Type', 'application/octet-stream')
          .end(done);
      });

      it('must return oblique image from partial volume', function(done: Function) {
        const test = supertest(httpServer).get('/series/1.2.3.4.5/scan');
        // if (token) test.set('Authorization', 'Bearer ' + token);
        test
          .query({
            start: 5,
            end: 15,
            delta: 2,

            origin: '200,200,50',
            xAxis: '512,0,0',
            yAxis: '0,512,0',
            size: '50,50'
          })
          .expect(200)
          .expect('Content-Type', 'application/octet-stream')
          .end(done);
      });

      it('must return oblique image in PNG format', function(done: Function) {
        const test = supertest(httpServer).get('/series/1.2.3.4.5/scan');
        // if (token) test.set('Authorization', 'Bearer ' + token);
        test
          .query({
            origin: '200,200,50',
            xAxis: '512,0,0',
            yAxis: '0,512,0',
            size: '50,50',
            format: 'png',
            ww: 50,
            wl: 50
          })
          .expect(200)
          .expect('Content-Type', 'image/png')
          .end(done);
      });
    });
  });
});

describe('with authentication', () => {
  let httpServer: Server;
  let loader: ServiceLoader<RsServices>;
  beforeAll(async () => {
    const config = {
      ...testConfig,
      rsServer: {
        options: {
          ...testConfig.rsServer.options,
          authorization: {
            enabled: true,
            tokenRequestIpFilter: '(^|:?)127.0.0.1$',
            expire: 1800
          }
        }
      }
    };
    loader = createServiceLoader(config);
    const dicomFileRepository = await loader.get('dicomFileRepository');
    await fillMockImages(dicomFileRepository);
    const app = await loader.get('rsServer');
    app.proxy = true;
    await new Promise(resolve => {
      httpServer = app.listen(port);
      httpServer = httpServer.on('listening', resolve);
    });
  });
  afterAll(async done => {
    await new Promise(resolve => {
      httpServer.on('close', resolve);
      httpServer.close();
    });
    await loader.dispose();
  });

  let token: string;
  it('must reject token request from invalid IP', function(done: Function) {
    supertest(httpServer)
      .get('/token')
      .set('X-Forwarded-For', '127.0.0.2')
      .expect(401)
      .end(done);
  });

  it('must issue valid token', function(done: Function) {
    supertest(httpServer)
      .get('/token')
      .query({ series: '1.2.3.4.5' })
      .expect((res: any) => {
        let result;
        ({ result, token } = res.body);
        if (result !== 'OK') throw new Error('Issuing token failed');
      })
      .expect(200)
      .end(done);
  });

  it('must return authentication error if token not passed', function(done: Function) {
    supertest(httpServer)
      .get('/series/1.2.3.4.5/metadata')
      .expect(401)
      .end(done);
  });

  it('must return authentication error if passed token is not matched', function(done: Function) {
    supertest(httpServer)
      .get('/series/8.8.8.8.8/metadata')
      .set('Authorization', 'Bearer ' + token)
      .expect(401)
      .end(done);
  });

  it('must return content if token is valid', function(done: Function) {
    supertest(httpServer)
      .get('/series/1.2.3.4.5/metadata')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .end(done);
  });
});

// Todo:
// requireEstimatedWindow=false
// partialVolume
