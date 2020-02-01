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
  expect(res.data.items).toHaveLength(3);
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
  }, 15000);

  it('should upload zipped DICOM files', async () => {
    const file = path.join(__dirname, '../../../test/dicom/test.zip');
    const res = await uploadTest(file);
    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ uploaded: 1 });
  }, 15000);

  it('should reject series upload into innaccessible domain', async () => {
    const file = path.join(
      __dirname,
      '../../../test/dicom/CT-MONO2-16-brain.dcm'
    );
    const res = await uploadTest(file, apiTest.axiosInstances.bob);
    if (res.status === 503) return;
    expect(res.status).toBe(403);
    expect(res.data.error).toMatch(/You cannot upload to this domain/);
  }, 15000);
});
