import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';
import path from 'path';
import fs from 'fs-extra';
import FormData from 'form-data';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

it('should perform search', async () => {
  const res = await axios.request({
    url: 'api/series',
    method: 'get'
  });
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(4);
});

it('should return single series information', async () => {
  const res = await axios.request({
    url: 'api/series/111.222.333.444.666',
    method: 'get'
  });
  expect(res.status).toBe(200);
  expect(res.data.manufacturer).toBe('Hatsushiba');
});

it('should reject 403 for unauthorized series', async () => {
  const res = await axios.request({
    url: 'api/series/111.222.333.444.777',
    method: 'get'
  });
  expect(res.status).toBe(403);
});

describe('Uploading', () => {
  const uploadTest = async (
    file: string,
    axios: AxiosInstance = apiTest.axiosInstances.alice,
    domain = 'sirius.org'
  ) => {
    const formData = new FormData();
    const fileData = await fs.readFile(file);
    formData.append('files', fileData, { filename: file });
    const res = await axios.request({
      method: 'post',
      url: `api/series/domain/${domain}`,
      headers: formData.getHeaders(),
      data: formData
    });
    if (res.status === 503) {
      console.warn(
        'Upload request returned with 503: Is dicom_utility installed?'
      );
    }
    return res;
  };

  it('should upload signle DICOM file', async () => {
    const file = path.join(
      __dirname,
      '../../../test/dicom/CT-MONO2-16-brain.dcm'
    );
    const res = await uploadTest(file);
    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ uploaded: 1 });
  });

  it('should upload zipped DICOM files', async () => {
    const file = path.join(__dirname, '../../../test/dicom/test.zip');
    const res = await uploadTest(file);
    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ uploaded: 1 });
  });

  it('should reject series upload into innaccessible domain', async () => {
    const file = path.join(
      __dirname,
      '../../../test/dicom/CT-MONO2-16-brain.dcm'
    );
    const res = await uploadTest(file, apiTest.axiosInstances.bob);
    if (res.status === 503) return;
    expect(res.status).toBe(403);
    expect(res.data.error).toMatch(/You cannot upload to this domain/);
  });
});

describe('Delete', () => {
  it('should delete single series', async () => {
    const res = await axios.request({
      url: 'api/series/222.333.444.555.666',
      method: 'delete'
    });
    expect(res.status).toBe(204);
    const series = await apiTest.db
      .collection('series')
      .findOne({ seriesUid: '222.333.444.555.666' });
    expect(series).toStrictEqual(null);
  });

  it('should fail with 404 for nonexistent series', async () => {
    const res = await axios.request({
      url: 'api/series/222.222.222.222.222',
      method: 'delete'
    });
    expect(res.status).toBe(404);
  });

  it('should fail with 400 if series is used in a plugin-job', async () => {
    const res = await axios.request({
      url: 'api/series/111.222.333.444.555',
      method: 'delete'
    });
    expect(res.status).toBe(400);
  });

  it('should fail with 400 if series is used in a clinical-case', async () => {
    const res = await axios.request({
      url: 'api/series/111.222.333.444.888',
      method: 'delete'
    });
    expect(res.status).toBe(400);
  });
});

describe('Delete file', () => {
  it('should delete single DICOM file', async () => {
    const dicomFileRepository = apiTest.dicomFileRepository;
    const series = await dicomFileRepository.getSeries('222.333.444.555.666');
    const input = new Uint8Array('abcde'.split('').map(c => c.charCodeAt(0)));
    await series.save(1, input.buffer as ArrayBuffer);
    await axios.request({
      url: 'api/series/222.333.444.555.666',
      method: 'delete'
    });
    const series2 = await dicomFileRepository.getSeries('222.333.444.555.666');
    expect(series2.images).toBe('');
  });
});
