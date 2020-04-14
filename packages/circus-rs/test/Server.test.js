'use strict';

const supertest = require('supertest');
const {
  MemoryDicomFileRepository
} = require('@utrad-ical/circus-lib/lib/dicom-file-repository');
const createServer = require('../src/server/createServer').default;
const createServiceLoader = require('../src/server/helper/createServiceLoader')
  .default;

const testConfig = {
  rsServer: {
    options: {
      port: 1024,
      globalIpFilter: '^127.0.0.1$'
    }
  },
  rsLogger: {
    type: 'NullLogger'
  },
  dicomFileRepository: {
    type: 'MemoryDicomFileRepository',
    options: {}
  },
  imageEncoder: {
    type: 'PngJsImageEncoder',
    options: {}
  },
  volumeProvider: {
    options: {
      cache: { memoryThreshold: 2147483648 }
    }
  }
};

const fs = require('fs');
const zlib = require('zlib');
const testdir = __dirname + '/test-dicom/';
const MOCK_IMAGE_COUNT = 20;

function dicomImage(file = 'CT-MONO2-16-brain') {
  return new Promise((ok, ng) => {
    try {
      const zippedFileContent = fs.readFileSync(testdir + file + '.gz');
      zlib.unzip(zippedFileContent, function(err, fileContent) {
        if (err) throw err;
        ok(fileContent);
      });
    } catch (err) {
      const fileContent = fs.readFileSync(testdir + file);
      ok(fileContent);
    }
  });
}

async function fillMockImages(dicomFileRepository) {
  const series = await dicomFileRepository.getSeries('1.2.3.4.5');
  const image = await dicomImage();
  for (let i = 1; i <= MOCK_IMAGE_COUNT; i++) {
    await series.save(i, image);
  }
}

describe('Server', () => {
  context('always', () => {
    let app;
    let httpServer;
    before(async () => {
      const { port } = testConfig;
      const loader = createServiceLoader(testConfig);
      const dicomFileRepository = await loader.get('dicomFileRepository');
      await fillMockImages(dicomFileRepository);
      app = await loader.get('rsServer');
      httpServer = app.listen(port, '0.0.0.0');
    });
    after(done => httpServer.close(done));

    it('must return JSON for status', function(done) {
      supertest(httpServer)
        .get('/status')
        .expect(200)
        .expect('Content-Type', /application\/json/)
        .expect(/Running/)
        .end(done);
    });

    it('must reject invalid access using globalIpFilter', function(done) {
      app.proxy = true;
      supertest(httpServer)
        .get('/status')
        .set('X-Forwarded-For', '127.0.0.11') // change IP
        .expect(401)
        .end(done);
    });

    it('must return 404 for nonexistent route', function(done) {
      supertest(httpServer)
        .get('/foobar')
        .expect(404)
        .end(done);
    });

    describe('series middleware', function() {
      it('must return valid access-control headers', function(done) {
        supertest(httpServer)
          .options('/series/1.2.3.4.5/metadata')
          .expect(res => {
            const { header } = res;
            if (
              !('access-control-allow-origin' in header) ||
              header['access-control-allow-methods'] !== 'GET'
            )
              throw new Error('Invalid access-control headers');
          })
          .end(done);
      });

      it.skip('must return 404 for nonexistent series');

      describe('metadata', async () => {
        it('must return metadata without estimated window by default', function(done) {
          supertest(httpServer)
            .get('/series/1.2.3.4.5/metadata')
            .expect(200)
            .expect(res => {
              if (res.body.estimatedWindow !== undefined)
                throw new Error('Invalid implemention');
            })
            .expect('Content-Type', /application\/json/)
            .end(done);
        });

        it('must return metadata without estimated window if estimatedWindow paramator is "none"', function(done) {
          supertest(httpServer)
            .get('/series/1.2.3.4.5/metadata')
            .expect(200)
            .expect(res => {
              if (res.body.estimatedWindow !== undefined)
                throw new Error('Invalid implemention');
            })
            .expect('Content-Type', /application\/json/)
            .end(done);
        });

        it('must return metadata with estimated window which was calculated by "first" algorythm', function(done) {
          supertest(httpServer)
            .get('/series/1.2.3.4.5/metadata?estimateWindow=first')
            .expect(200)
            .expect(res => {
              if (res.body.estimatedWindow === undefined)
                throw new Error('Invalid implemention');
            })
            .expect('Content-Type', /application\/json/)
            .end(done);
        });

        it('must return metadata with estimated window which was calculated by "center" algorythm', function(done) {
          supertest(httpServer)
            .get('/series/1.2.3.4.5/metadata?estimateWindow=center')
            .expect(200)
            .expect(res => {
              if (res.body.estimatedWindow === undefined)
                throw new Error('Invalid implemention');
            })
            .expect('Content-Type', /application\/json/)
            .end(done);
        });

        it('must return metadata with estimated window which was calculated by "full" algorythm', function(done) {
          supertest(httpServer)
            .get('/series/1.2.3.4.5/metadata?estimateWindow=full')
            .expect(200)
            .expect(res => {
              if (res.body.estimatedWindow === undefined)
                throw new Error('Invalid implemention');
            })
            .expect('Content-Type', /application\/json/)
            .end(done);
        });

        it('must return partial metadata', function(done) {
          supertest(httpServer)
            .get('/series/1.2.3.4.5/metadata?start=5&end=15&delta=2')
            .expect(200)
            .expect(res => {
              const { voxelCount } = res.body;
              if (voxelCount[2] !== [5, 7, 9, 11, 13, 15].length)
                throw new Error('Invalid partial metadata');
            })
            .expect('Content-Type', /application\/json/)
            .end(done);
        });
      });

      describe('volume', async () => {
        let fullVolumeSize = Infinity;

        it('must return volume', function(done) {
          supertest(httpServer)
            .get('/series/1.2.3.4.5/volume')
            .expect(200)
            .expect(res => (fullVolumeSize = res.header['content-length']))
            .expect('Content-Type', 'application/octet-stream')
            .end(done);
        });

        it('must return partial volume', function(done) {
          supertest(httpServer)
            .get('/series/1.2.3.4.5/volume?start=5&end=15&delta=2')
            .expect(200)
            .expect('Content-Type', 'application/octet-stream')
            .expect(res => {
              const a = res.header['content-length'] / fullVolumeSize;
              const b = [5, 7, 9, 11, 13, 15].length / MOCK_IMAGE_COUNT;
              if (a !== b) throw new Error('Invalid implemention');
            })
            .end(done);
        });
      });

      describe('scan', async () => {
        it('must return oblique image in binary format', function(done) {
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

        it('must return oblique image from partial volume', function(done) {
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

        it('must return oblique image in PNG format', function(done) {
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
  context('with authentication', () => {
    let app;
    let httpServer;
    before(async () => {
      const config = {
        ...testConfig,
        rsServer: {
          options: {
            ...testConfig.rsServer.options,
            authorization: {
              enabled: true,
              tokenRequestIpFilter: '^127.0.0.1$',
              expire: 1800
            }
          }
        }
      };
      const { port } = config;
      const loader = createServiceLoader(config);
      const dicomFileRepository = await loader.get('dicomFileRepository');
      await fillMockImages(dicomFileRepository);
      app = await loader.get('rsServer');
      httpServer = app.listen(port, '0.0.0.0');
    });
    after(done => httpServer.close(done));

    let token;
    it('must reject token request from invalid IP', function(done) {
      app.proxy = true;
      supertest(httpServer)
        .get('/token')
        .set('X-Forwarded-For', '127.0.0.2')
        .expect(401)
        .end(done);
    });

    it('must issue valid token', function(done) {
      supertest(httpServer)
        .get('/token')
        .query({ series: '1.2.3.4.5' })
        .expect(res => {
          let result;
          ({ result, token } = res.body);
          if (result !== 'OK') throw new Error('Issuing token is failed');
        })
        .expect(200)
        .end(done);
    });

    it('must return authentication error if token not passed', function(done) {
      supertest(httpServer)
        .get('/series/1.2.3.4.5/metadata')
        .expect(401)
        .end(done);
    });

    it('must return authentication error if passed token is not matched', function(done) {
      supertest(httpServer)
        .get('/series/8.8.8.8.8/metadata')
        .set('Authorization', 'Bearer ' + token)
        .expect(401)
        .end(done);
    });

    it('must return content if token is valid', function(done) {
      supertest(httpServer)
        .get('/series/1.2.3.4.5/metadata')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .end(done);
    });
  });
});

// Todo:
// requireEstimatedWindow=false
// partialVolume
