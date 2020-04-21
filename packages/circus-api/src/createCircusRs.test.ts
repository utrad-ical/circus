import createCircusRs from './createCircusRs';
import createNullLogger from '@utrad-ical/circus-lib/lib/logger/NullLogger';
import MemoryDicomFileRepository from '@utrad-ical/circus-lib/lib/dicom-file-repository/MemoryDicomFileRepository';
import { setUpKoaTest, TestServer } from '../test/util-koa';
import _axios, { AxiosInstance } from 'axios';
import createVolumeProvider from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import dicomImageExtractor from '@utrad-ical/circus-lib/lib/image-extractor/dicomImageExtractor';
import { PassThrough } from 'stream';
import { CircusRs } from './interface';

let testServer: TestServer, rs: CircusRs, axios: AxiosInstance;

beforeAll(async () => {
  const apiLogger = await createNullLogger({}, {});
  const dicomFileRepository = new MemoryDicomFileRepository({});
  const extractor = dicomImageExtractor();
  const imageEncoder = {
    mimeType: () => 'image/png',
    write: async () => {
      const stream = new PassThrough();
      stream.end('abc');
      return stream;
    }
  };
  const volumeProvider = await createVolumeProvider(
    {},
    { dicomFileRepository, dicomImageExtractor: extractor }
  );
  rs = await createCircusRs({}, { apiLogger, volumeProvider, imageEncoder });

  testServer = await setUpKoaTest(async koa => {
    koa.use(rs.routes);
  });

  axios = _axios.create({
    validateStatus: () => true,
    baseURL: testServer.url
  });
});

afterAll(async () => {
  await testServer.tearDown();
});

describe('volumeProvider', () => {
  test('throws for nonexistent series', async () => {
    await expect(rs.volumeProvider('1.2.3')).rejects.toThrow(
      /could not be loaded/
    );
  });
});

test('metadata', async () => {
  const seriesUid = '1.2.3';
  const res = await axios.get(`series/${seriesUid}/metadata`);
  expect(res.status).toBe(404);
});
