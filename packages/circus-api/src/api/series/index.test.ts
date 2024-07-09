import { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';
import tarfs from 'tar-fs';
import zlib from 'zlib';
import { setUpMongoFixture } from '../../../test/util-mongo';
import { ApiTest, setUpAppForRoutesTest } from '../../../test/util-routes';
import delay from '../../utils/delay';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;

beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
  console.log('apiTest initialized:', apiTest);
});

afterAll(async () => {
  if (apiTest && typeof apiTest.tearDown === 'function') {
    console.log('Calling tearDown');
    await apiTest.tearDown();
    console.log('tearDown called successfully');
  } else {
    console.error('tearDown is not a function or apiTest is undefined');
  }
});

it('should perform search', async () => {
  const res = await ax.dave.request({
    url: 'api/series',
    method: 'get'
  });
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(9);
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

test('throw 400 if search using patient information for unprivileged user', async () => {
  const res = await ax.frank.request({
    url: 'api/series',
    method: 'get',
    params: { filter: { 'patientInfo.patientName': 'Koume' } }
  });
  expect(res.status).toBe(400);
});

test('should be searchable if patient information is not used', async () => {
  const res = await ax.frank.request({
    url: 'api/series',
    method: 'get',
    params: { filter: { seriesUid: '222.333.444.555.666' } }
  });
  expect(res.status).toBe(200);
  expect(res.data.items).toHaveLength(1);
});

describe('getOrientation', () => {
  test('head-first ascending order', async () => {
    const res = await ax.dave.request({
      url: 'api/series/333.444.555.666.777/orientation',
      method: 'get',
      params: { start: 1, end: 10 }
    });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ orientation: 'head-first' });
  });

  test('unspecified start/end', async () => {
    const res = await ax.dave.request({
      url: 'api/series/333.444.555.666.777/orientation',
      method: 'get'
    });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ orientation: 'head-first' });
  });

  test('throw 400 for image out of bounds', async () => {
    const res = await ax.dave.request({
      url: 'api/series/333.444.555.666.777/orientation',
      method: 'get',
      params: { start: 1, end: 100 }
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('The given start/end number is out of bounds.');
  });

  test('throw 403 for unprivileged user', async () => {
    const res = await ax.guest.request({
      url: 'api/series/333.444.555.666.777/orientation',
      method: 'get',
      params: { start: 1, end: 10 }
    });
    expect(res.status).toBe(403);
    expect(res.data.error).toBe(
      'You do not have privilege to access this series.'
    );
  });

  test('throw 500 for series defined in DB but missing in repository', async () => {
    const res = await ax.dave.request({
      url: 'api/series/111.222.333.444.555/orientation',
      method: 'get',
      params: { filter: { start: 1, end: 10 } }
    });
    expect(res.status).toBe(500);
    expect(res.data.error).toBe('no image');
  });
});

describe('Upload', () => {
  const file = path.join(
    __dirname,
    '../../../test/dicom/CT-MONO2-16-brain.dcm'
  );
  const seriesUid =
    '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20';

  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['series']);
  });

  describe('with a task', () => {
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

    test('upload signle DICOM file', async () => {
      const res = await uploadTest(file);
      if (res.status === 503) return;
      expect(res.status).toBe(201);
      expect(res.data?.taskId).toHaveLength(26);
      const taskId = res.data.taskId;
      while (apiTest.taskManager.isTaskInProgress(taskId)) {
        await delay(10);
      }
      const doc = await apiTest.database.db.collection('series').findOne({
        seriesUid
      });
      expect(doc?.images).toBe('8');
    });

    test('upload zipped DICOM files', async () => {
      const file = path.join(__dirname, '../../../test/dicom/test.zip');
      const res = await uploadTest(file);
      if (res.status === 503) return;
      expect(res.status).toBe(201);
      expect(res.data?.taskId).toHaveLength(26);
    });

    test('reject series upload into innaccessible domain', async () => {
      const res = await uploadTest(file, apiTest.axiosInstances.bob);
      if (res.status === 503) return;
      expect(res.status).toBe(403);
      expect(res.data.error).toMatch(/You cannot upload to this domain/);
    });
  });

  describe('without a task', () => {
    test('should upload signle DICOM file', async () => {
      const formData = new FormData();
      const fileData = await fs.readFile(file);
      formData.append('files', fileData, { filename: file });
      const res = await apiTest.axiosInstances.dave.request({
        method: 'post',
        url: `api/series/domain/sirius.org/single`,
        headers: formData.getHeaders(),
        data: formData
      });
      expect(res.status).toBe(201);
      const doc = await apiTest.database.db.collection('series').findOne({
        seriesUid
      });
      expect(doc?.images).toBe('8');
    });
  });
});

describe('Delete', () => {
  it('should delete single series', async () => {
    const res = await ax.dave.request({
      url: 'api/series/222.333.444.555.666',
      method: 'delete'
    });
    expect(res.status).toBe(204);
    const series = await apiTest.database.db
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
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['series']);
  });

  it('should delete single DICOM file', async () => {
    const dicomFileRepository = apiTest.dicomFileRepository;
    const series = await dicomFileRepository.getSeries('222.333.444.555.666');
    const input = new Uint8Array('abcde'.split('').map(c => c.charCodeAt(0)));
    await series.save(1, input.buffer as ArrayBuffer);
    const res = await ax.dave.request({
      url: 'api/series/222.333.444.555.666',
      method: 'delete'
    });
    expect(res.status).toBe(204);
    const series2 = await dicomFileRepository.getSeries('222.333.444.555.666');
    expect(series2.images).toBe('');
  });

  it('should throw 404 for deletion of nonexistent series', async () => {
    const res = await ax.dave.request({
      url: 'api/series/nonexistentSeries',
      method: 'delete'
    });
    expect(res.status).toBe(404);
  });
});

describe('search by my list', () => {
  const myListId = '01ez9knaakz9tgd2hpyceagj11'; // Dave's

  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['users']);
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
    await apiTest.database.db
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
    await apiTest.database.db
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

describe('Export CS volume', () => {
  beforeEach(async () => {
    await fs.emptyDir(apiTest.downloadFileDirectory);
  });

  afterEach(async () => {
    await fs.remove(apiTest.downloadFileDirectory);
  });

  test('export', async () => {
    const res = await ax.bob.post('api/series/export-cs-volume', {
      series: [
        {
          seriesUid: '222.333.444.555.666',
          partialVolumeDescriptor: { start: 1, end: 2, delta: 1 }
        }
      ],
      compressionFormat: 'tgz'
    });
    expect(res.status).toBe(201);
    const taskId = res.data.taskId;

    while (apiTest.taskManager.isTaskInProgress(taskId)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const file = fs.createReadStream(
      path.join(apiTest.downloadFileDirectory, taskId)
    );
    const unzip = zlib.createGunzip();
    const tarStream = tarfs.extract(apiTest.downloadFileDirectory);
    file.pipe(unzip).pipe(tarStream);
    await new Promise<void>(resolve => tarStream.on('finish', resolve));

    const textContent = await fs.readFile(
      path.join(apiTest.downloadFileDirectory, 'dummy.txt'),
      'utf8'
    );
    expect(textContent).toBe('abc');
  });
});
