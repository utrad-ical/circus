import { setUpAppForRoutesTest, ApiTest } from '../../../test/util-routes';
import { AxiosInstance } from 'axios';
import path from 'path';
import fs from 'fs-extra';
import FormData from 'form-data';
import delay from '../../utils/delay';
import { setUpMongoFixture } from '../../../test/util-mongo';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
});
afterAll(async () => await apiTest.tearDown());

it('should perform search', async () => {
  const res = await ax.dave.request({
    url: 'api/series',
    method: 'get'
  });
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(7);
});

it('should return single series information', async () => {
  const res = await ax.dave.request({
    url: 'api/series/111.222.333.444.666',
    method: 'get'
  });
  expect(res.status).toBe(200);
  expect(res.data.manufacturer).toBe('Hatsushiba');
});

it('should reject 403 for unauthorized series', async () => {
  const res = await ax.guest.request({
    url: 'api/series/111.222.333.444.777',
    method: 'get'
  });
  expect(res.status).toBe(403);
});

describe('Uploading', () => {
  const uploadTest = async (
    file: string,
    axios: AxiosInstance = apiTest.axiosInstances.dave,
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
    expect(res.data?.taskId).toHaveLength(26);
    const taskId = res.data.taskId;
    while (apiTest.taskManager.isTaskInProgress(taskId)) {
      await delay(10);
    }
    const doc = await apiTest.db.collection('series').findOne({
      seriesUid: '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20'
    });
    expect(doc?.images).toBe('8');
  });

  it('should upload zipped DICOM files', async () => {
    const file = path.join(__dirname, '../../../test/dicom/test.zip');
    const res = await uploadTest(file);
    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(res.data?.taskId).toHaveLength(26);
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
    const res = await ax.dave.request({
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
    const res = await ax.dave.request({
      url: 'api/series/222.222.222.222.222',
      method: 'delete'
    });
    expect(res.status).toBe(404);
  });

  it('should fail with 400 if series is used in a plugin-job', async () => {
    const res = await ax.dave.request({
      url: 'api/series/111.222.333.444.555',
      method: 'delete'
    });
    expect(res.status).toBe(400);
  });

  it('should fail with 400 if series is used in a clinical-case', async () => {
    const res = await ax.dave.request({
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
    await ax.dave.request({
      url: 'api/series/222.333.444.555.666',
      method: 'delete'
    });
    const series2 = await dicomFileRepository.getSeries('222.333.444.555.666');
    expect(series2.images).toBe('');
  });
});

describe('search by my list', () => {
  const myListId = '01ez9knaakz9tgd2hpyceagj11'; // Dave's

  beforeEach(async () => {
    await setUpMongoFixture(apiTest.db, ['users']);
  });

  test('search succeeds', async () => {
    const res = await ax.dave.request({
      url: `api/series/list/${myListId}`,
      method: 'get'
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].patientInfo.patientName).toBe('Koume');
  });

  test('should not return patient info when personalInfoView = false', async () => {
    await apiTest.db
      .collection('users')
      .updateOne(
        { userEmail: 'dave@example.com' },
        { $set: { 'preferences.personalInfoView': false } }
      );
    const res = await ax.dave.request({
      url: `api/series/list/${myListId}`,
      method: 'get'
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0].patientInfo).toBe(undefined);
  });

  test('can not search when use nonexistent myListId in myList', async () => {
    const nonexistentId = '11111111111111111111111111';
    const res = await ax.dave.request({
      url: `api/series/list/${nonexistentId}`,
      method: 'get'
    });
    expect(res.status).toBe(404);
  });

  test('should not return results if domain check fails', async () => {
    await apiTest.db
      .collection('users')
      .updateOne({ userEmail: 'dave@example.com' }, { $set: { groups: [] } });
    const res = await ax.dave.request({
      url: `api/series/list/${myListId}`,
      method: 'get'
    });
    expect(res.status).toBe(200);
    expect(res.data.items).toHaveLength(0);
  });

  test('should throw 400 for non-series mylist type', async () => {
    const caseMyListId = '01ezab6xqfac7hvm5s09yw1g1j';
    const res = await ax.dave.request({
      url: `api/series/list/${caseMyListId}`,
      method: 'get'
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('This my list is not for series');
  });
});
