import assert from 'node:assert/strict';
import {
  describe,
  test,
  it,
  before,
  after,
  beforeEach,
  afterEach
} from 'node:test';
import type { AxiosInstance } from 'axios';
import { packTar } from 'modern-tar';
import type { Readable } from 'node:stream';
import fs from 'fs-extra';
import path from 'path';
import { setUpMongoFixture } from '../../test/util-mongo.ts';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import { readFromStreamTillEnd } from '../../test/util-stream.ts';
import { readArchive } from '../../test/util-archive.ts';

let apiTest: ApiTest, ax: typeof apiTest.axiosInstances;

before(async () => {
  apiTest = await setUpAppForRoutesTest();
  ax = apiTest.axiosInstances;
});

after(async () => await apiTest.tearDown());

it('should perform search', async () => {
  const res = await ax.dave.request({
    url: 'api/series',
    method: 'get'
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.items.length, 9);
});

it('should return single series information', async () => {
  const res = await ax.dave.request({
    url: 'api/series/111.222.333.444.666',
    method: 'get'
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.manufacturer, 'Hatsushiba');
});

it('should reject 403 for unauthorized series', async () => {
  const res = await ax.guest.request({
    url: 'api/series/111.222.333.444.777',
    method: 'get'
  });
  assert.equal(res.status, 403);
});

test('throw 400 if search using patient information for unprivileged user', async () => {
  const res = await ax.frank.request({
    url: 'api/series',
    method: 'get',
    params: { filter: JSON.stringify({ 'patientInfo.patientName': 'Koume' }) }
  });
  assert.equal(res.status, 400);
});

test('should be searchable if patient information is not used', async () => {
  const res = await ax.frank.request({
    url: 'api/series',
    method: 'get',
    params: { filter: JSON.stringify({ seriesUid: '222.333.444.555.666' }) }
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.items.length, 1);
});

describe('getOrientation', () => {
  test('head-first ascending order', async () => {
    const res = await ax.dave.request({
      url: 'api/series/333.444.555.666.777/orientation',
      method: 'get',
      params: { start: 1, end: 10 }
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { orientation: 'head-first' });
  });

  test('unspecified start/end', async () => {
    const res = await ax.dave.request({
      url: 'api/series/333.444.555.666.777/orientation',
      method: 'get'
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { orientation: 'head-first' });
  });

  test('throw 400 for image out of bounds', async () => {
    const res = await ax.dave.request({
      url: 'api/series/333.444.555.666.777/orientation',
      method: 'get',
      params: { start: 1, end: 100 }
    });
    assert.equal(res.status, 400);
    assert.equal(
      res.data.error,
      'The given start/end number is out of bounds.'
    );
  });

  test('throw 403 for unprivileged user', async () => {
    const res = await ax.guest.request({
      url: 'api/series/333.444.555.666.777/orientation',
      method: 'get',
      params: { start: 1, end: 10 }
    });
    assert.equal(res.status, 403);
    assert.equal(
      res.data.error,
      'You do not have privilege to access this series.'
    );
  });

  test('throw 500 for series defined in DB but missing in repository', async () => {
    const res = await ax.dave.request({
      url: 'api/series/111.222.333.444.555/orientation',
      method: 'get',
      params: { filter: JSON.stringify({ start: 1, end: 10 }) }
    });
    assert.equal(res.status, 500);
    assert.equal(res.data.error, 'no image');
  });
});

describe('Upload', () => {
  const dicomDir = path.join(import.meta.dirname, '../../../test/dicom');
  const brain = path.join(dicomDir, 'CT-MONO2-16-brain.dcm');
  const brainUid =
    '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20';

  beforeEach(async () => {
    await setUpMongoFixture(apiTest.database.db, ['series']);
  });

  const file = async (p: string) =>
    new Blob([new Uint8Array(await fs.readFile(p))]);

  // A file that looks like DICOM but is broken
  const brokenDicom = () => {
    const data = new Uint8Array(200).fill(0xff);
    data.set(new TextEncoder().encode('DICM'), 128);
    return new Blob([data]);
  };

  // Minimal DICOMDIR, with only the meta header
  const dicomDirFile = () => {
    const element = (el: number, value: string) => {
      if (value.length % 2) value += '\0';
      const buf = new Uint8Array(8 + value.length);
      const view = new DataView(buf.buffer);
      view.setUint16(0, 2, true);
      view.setUint16(2, el, true);
      buf.set(new TextEncoder().encode('UI'), 4);
      view.setUint16(6, value.length, true);
      buf.set(new TextEncoder().encode(value), 8);
      return buf;
    };
    return new Blob([
      new Uint8Array(128),
      'DICM',
      element(0x0002, '1.2.840.10008.1.3.10'),
      element(0x0010, '1.2.840.10008.1.2.1')
    ]);
  };

  const upload = async (
    files: [Blob, string][],
    opts: { axios?: AxiosInstance; url?: string } = {}
  ) => {
    const {
      axios = apiTest.axiosInstances.dave,
      url = 'api/series/domain/sirius.org'
    } = opts;
    const fd = new FormData();
    for (const [blob, name] of files) fd.append('files', blob, name);
    return await axios.post(url, fd);
  };

  const imagesOf = async (seriesUid: string) =>
    (await apiTest.database.db.collection('series').findOne({ seriesUid }))
      ?.images;

  test('imports a DICOM file', async () => {
    const res = await upload([[await file(brain), 'brain.dcm']]);
    assert.equal(res.status, 201);
    assert.deepEqual(res.data, { imported: 1, skipped: [], errors: [] });
    assert.equal(await imagesOf(brainUid), '8');
  });

  test('imports archives and files in one request', async () => {
    const tar = await packTar(
      await Promise.all(
        [1, 2, 3].map(async i => {
          const body = await fs.readFile(
            path.join(dicomDir, `head-first00${i}.dcm`)
          );
          return {
            header: { name: `d/${i}.dcm`, size: body.length, type: 'file' },
            body: new Uint8Array(body)
          } as const;
        })
      )
    );
    const tgz = await new Response(
      new Blob([tar]).stream().pipeThrough(new CompressionStream('gzip'))
    ).blob();
    const res = await upload([
      [await file(path.join(dicomDir, 'test.zip')), 'test.zip'],
      [tgz, 'head.tar.gz'],
      [new Blob(['hello']), 'dir/readme.txt'],
      [dicomDirFile(), 'cd/DICOMDIR']
    ]);
    assert.equal(res.status, 201);
    assert.deepEqual(res.data, {
      imported: 4,
      skipped: [
        { file: 'dir/readme.txt', reason: 'Not a DICOM file' },
        { file: 'cd/DICOMDIR', reason: 'DICOMDIR' }
      ],
      errors: []
    });
    assert.equal(await imagesOf(brainUid), '8');
  });

  test('continues after a broken file and returns 422', async () => {
    const res = await upload([
      [brokenDicom(), 'broken.dcm'],
      [new Blob(['PK\x03\x04broken']), 'broken.zip'],
      [await file(brain), 'brain.dcm']
    ]);
    assert.equal(res.status, 422);
    assert.equal(res.data.imported, 1);
    assert.deepEqual(
      res.data.errors.map((e: any) => e.file),
      ['broken.dcm', 'broken.zip']
    );
    assert.match(res.data.errors[1].reason, /^Invalid archive/);
    assert.equal(await imagesOf(brainUid), '8');
  });

  test('returns 400 when there is no DICOM file', async () => {
    const res = await upload([[new Blob(['hello']), 'a.txt']]);
    assert.equal(res.status, 400);
    assert.deepEqual(res.data.skipped, [
      { file: 'a.txt', reason: 'Not a DICOM file' }
    ]);
  });

  test('accepts the legacy single-file URL', async () => {
    const res = await upload([[await file(brain), 'brain.dcm']], {
      url: 'api/series/domain/sirius.org/single'
    });
    assert.equal(res.status, 201);
    assert.equal(await imagesOf(brainUid), '8');
  });

  test('rejects upload into an inaccessible domain', async () => {
    const res = await upload([[await file(brain), 'brain.dcm']], {
      axios: apiTest.axiosInstances.bob
    });
    assert.equal(res.status, 403);
    assert.match(res.data.error, /You cannot upload to this domain/);
  });

  test('reports the progress with the log', async () => {
    const { dave } = apiTest.axiosInstances;
    const progressId = (await dave.post('api/progress', {})).data.progressId;
    const sse = await dave.get(`api/progress/${progressId}`, {
      responseType: 'stream'
    });
    const events = readFromStreamTillEnd(sse.data as Readable);
    const res = await upload(
      [
        [await file(brain), 'brain.dcm'],
        [brokenDicom(), 'broken.dcm']
      ],
      { url: `api/series/domain/sirius.org?progressId=${progressId}` }
    );
    assert.equal(res.status, 422);
    const text = await events;
    assert.match(text, /event: log\ndata: .*"Imported brain.dcm"/);
    assert.match(text, /"level":"error","message":"Failed broken.dcm: /);
    assert.match(
      text,
      /event: finish\ndata: {"message":"Imported 1 file\(s\), failed 1."}/
    );
  });
});

describe('Delete', () => {
  it('should delete single series', async () => {
    const res = await ax.dave.request({
      url: 'api/series/222.333.444.555.666',
      method: 'delete'
    });
    assert.equal(res.status, 204);
    const series = await apiTest.database.db
      .collection('series')
      .findOne({ seriesUid: '222.333.444.555.666' });
    assert.deepEqual(series, null);
  });

  it('should fail with 404 for nonexistent series', async () => {
    const res = await ax.dave.request({
      url: 'api/series/222.222.222.222.222',
      method: 'delete'
    });
    assert.equal(res.status, 404);
  });

  it('should fail with 400 if series is used in a plugin-job', async () => {
    const res = await ax.dave.request({
      url: 'api/series/111.222.333.444.555',
      method: 'delete'
    });
    assert.equal(res.status, 400);
  });

  it('should fail with 400 if series is used in a clinical-case', async () => {
    const res = await ax.dave.request({
      url: 'api/series/111.222.333.444.888',
      method: 'delete'
    });
    assert.equal(res.status, 400);
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
    assert.equal(res.status, 204);
    const series2 = await dicomFileRepository.getSeries('222.333.444.555.666');
    assert.equal(series2.images, '');
  });

  it('should throw 404 for deletion of nonexistent series', async () => {
    const res = await ax.dave.request({
      url: 'api/series/nonexistentSeries',
      method: 'delete'
    });
    assert.equal(res.status, 404);
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
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].patientInfo.patientName, 'Koume');
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
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].patientInfo, undefined);
  });

  test('can not search when use nonexistent myListId in myList', async () => {
    const nonexistentId = '11111111111111111111111111';
    const res = await ax.dave.request({
      url: `api/series/list/${nonexistentId}`,
      method: 'get'
    });
    assert.equal(res.status, 404);
  });

  test('should not return results if domain check fails', async () => {
    await apiTest.database.db
      .collection('users')
      .updateOne({ userEmail: 'dave@example.com' }, { $set: { groups: [] } });
    const res = await ax.dave.request({
      url: `api/series/list/${myListId}`,
      method: 'get'
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 0);
  });

  test('should throw 400 for non-series mylist type', async () => {
    const caseMyListId = '01ezab6xqfac7hvm5s09yw1g1j';
    const res = await ax.dave.request({
      url: `api/series/list/${caseMyListId}`,
      method: 'get'
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'This my list is not for series');
  });
});

describe('Export CS volume', () => {
  const download = (params: object, user: keyof typeof ax = 'bob') =>
    ax[user].get('api/series/export-cs-volume', {
      params,
      responseType: 'arraybuffer'
    });

  const readSeries = (files: Map<string, Uint8Array>) =>
    JSON.parse(new TextDecoder().decode(files.get('series.json')));

  for (const compressionFormat of ['tgz', 'zip'] as const) {
    test(`exports as ${compressionFormat}`, async () => {
      const res = await download({
        series: '111.222.333.444.777:1:5:2,222.222.333.444.777',
        compressionFormat
      });
      assert.equal(res.status, 200);
      assert.equal(
        res.headers['content-type'],
        compressionFormat === 'zip' ? 'application/zip' : 'application/gzip'
      );
      assert.match(
        res.headers['content-disposition'],
        compressionFormat === 'zip'
          ? /filename="111.222.333.444.777.zip"/
          : /filename="111.222.333.444.777.tar.gz"/
      );
      const files = await readArchive(
        compressionFormat,
        new Blob([res.data]).stream()
      );
      assert.equal(new TextDecoder().decode(files.get('dummy.txt')), 'abc');
      // The first range of the series without the range
      assert.deepEqual(readSeries(files), [
        {
          seriesUid: '111.222.333.444.777',
          partialVolumeDescriptor: { start: 1, end: 5, delta: 2 }
        },
        {
          seriesUid: '222.222.333.444.777',
          partialVolumeDescriptor: { start: 1, end: 236, delta: 1 }
        }
      ]);
    });
  }

  test('reports the progress', async () => {
    const issued = await ax.bob.post('api/progress', {});
    const { progressId } = issued.data;
    const sse = await ax.bob.get(`api/progress/${progressId}`, {
      responseType: 'stream'
    });
    const events = readFromStreamTillEnd(sse.data as Readable);
    const res = await download({ series: '111.222.333.444.777', progressId });
    assert.equal(res.status, 200);
    assert.match(
      await events,
      /event: finish\ndata: \{"message":"Exported 1 volume\(s\)."\}/
    );
  });

  test('reports an error before the download in the progress', async () => {
    const issued = await ax.bob.post('api/progress', {});
    const { progressId } = issued.data;
    const res = await download({ series: '111.222.333.444.555', progressId });
    assert.equal(res.status, 403);
    const sse = await ax.bob.get(`api/progress/${progressId}`, {
      responseType: 'stream'
    });
    assert.match(
      await readFromStreamTillEnd(sse.data as Readable),
      /event: error\ndata: \{"message":"You do not have privilege/
    );
  });

  test('rejects series in an inaccessible domain', async () => {
    const res = await download({
      series: '111.222.333.444.777,111.222.333.444.555'
    });
    assert.equal(res.status, 403);
  });

  test('rejects a nonexistent series', async () => {
    const res = await download({ series: '9.9.9.9' });
    assert.equal(res.status, 404);
  });

  test('rejects invalid queries', async () => {
    const tooMany = Array(11).fill('111.222.333.444.777').join(',');
    for (const params of [
      {},
      { series: '' },
      { series: '111.222.333.444.777:1:2' },
      { series: '111.222.333.444.777:1:5:0' },
      { series: '111.222.333.444.777:1:x:1' },
      { series: '111.222.333.444.777:1:300:1' }, // out of the series
      { series: '111.222.333.444.777:5:1:1' }, // wrong direction
      { series: tooMany },
      { series: '111.222.333.444.777', compressionFormat: 'rar' },
      { series: '111.222.333.444.777', unknown: 1 }
    ]) {
      const res = await download(params);
      assert.equal(res.status, 400, JSON.stringify(params));
    }
  });

  test('rejects users without the privilege', async () => {
    const res = await download({ series: '111.222.333.444.555' }, 'frank');
    assert.equal(res.status, 401);
  });
});
