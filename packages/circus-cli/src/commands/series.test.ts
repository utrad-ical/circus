import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';
import { unpackTar } from 'modern-tar';
import {
  captureExitCode,
  commandDeps,
  runCommand,
  tempDirectory
} from '../test/command.ts';
import seriesExportArgs from './series-export.args.ts';
import seriesExport from './series-export.ts';
import seriesImportArgs from './series-import.args.ts';
import seriesImport from './series-import.ts';

test('uploads loose files and archives in batches and reports partial failure', async t => {
  const log = t.mock.method(console, 'log', () => {});
  captureExitCode(t);
  const directory = await tempDirectory(t);
  const loose = join(directory, 'sample.dcm');
  const archive = join(directory, 'archive.zip');
  const extra = join(directory, 'extra.dcm');
  const archiveBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 5, 6]);
  await writeFile(loose, 'DICOM fixture');
  await writeFile(archive, archiveBytes);
  await writeFile(extra, 'Another DICOM fixture');
  const uploads: string[] = [];
  const deps = commandDeps({
    isInputTTY: true,
    prompts: {
      select: async ({ default: domain, message }) => {
        assert.equal(message, 'Domain:');
        assert.equal(domain, 'study');
        return domain;
      }
    },
    getFetch: () => async (resource, init) => {
      if (resource === 'login-info/full') {
        return Response.json({
          domains: ['study', 'other'],
          defaultDomain: 'study'
        });
      }
      if (resource === 'progress') throw new Error('Progress unavailable');
      assert.equal(resource, 'series/domain/study');
      assert.equal(init?.method, 'POST');
      assert.ok(init?.body instanceof ReadableStream);
      const form = await new Response(init.body, {
        headers: init.headers
      }).formData();
      const files = form.getAll('files');
      assert.equal(files.length, 1);
      const [file] = files;
      assert.ok(file instanceof File);
      if (file.name === 'archive.zip') {
        uploads.push(file.name);
        assert.deepEqual(
          new Uint8Array(await file.arrayBuffer()),
          archiveBytes
        );
        throw Object.assign(new Error('HTTP 422'), {
          status: 422,
          body: JSON.stringify({
            imported: 1,
            skipped: [],
            errors: [{ file: 'broken.dcm', reason: 'Invalid DICOM' }]
          })
        });
      }
      assert.equal(file.name, 'circus-cli-upload.tar.gz');
      const [entry] = await unpackTar(gunzipSync(await file.arrayBuffer()));
      uploads.push(entry.header.name);
      assert.equal(
        new TextDecoder().decode(entry.data),
        entry.header.name === 'sample.dcm'
          ? 'DICOM fixture'
          : 'Another DICOM fixture'
      );
      return Response.json({ imported: 1, skipped: [], errors: [] });
    }
  });

  await runCommand(
    'series',
    seriesImportArgs,
    seriesImport,
    ['-b', '1', loose, archive, extra],
    deps
  );

  assert.deepEqual(uploads, ['sample.dcm', 'archive.zip', 'extra.dcm']);
  assert.match(
    log.mock.calls.flatMap(call => call.arguments).join('\n'),
    /imported 3 file\(s\), failed 1/
  );
  assert.match(
    log.mock.calls.flatMap(call => call.arguments).join('\n'),
    /broken\.dcm: Invalid DICOM/
  );
  assert.equal(process.exitCode, 1);
});

test('downloads the series using the concrete range displayed by the selector', async t => {
  t.mock.method(console, 'log', () => {});
  const file = join(await tempDirectory(t), 'volumes.zip');
  const requests: string[] = [];
  const deps = commandDeps({
    isInputTTY: true,
    prompts: {
      input: async ({ message, default: defaultRange, validate }) => {
        const answer = message.includes('Series UID') ? '1.2.3' : '4:10:1';
        if (message.includes('Image range')) assert.equal(defaultRange, answer);
        assert.ok(validate);
        assert.equal(await validate(answer), true);
        return answer;
      },
      select: async ({ choices, default: selection }) => {
        assert.ok(
          choices.some(
            choice =>
              typeof choice === 'object' &&
              choice !== null &&
              'name' in choice &&
              String(choice.name).includes('4:10:1 (7 images)')
          )
        );
        assert.equal(selection, 'submit');
        return selection;
      }
    },
    getFetch: () => async resource => {
      if (resource === 'series/1.2.3') {
        return Response.json({ images: '4-10,20-22', studyUid: '1.2' });
      }
      if (resource === 'progress') throw new Error('Progress unavailable');
      const url = new URL(resource, 'https://example.test/');
      assert.equal(url.pathname, '/series/export-cs-volume');
      assert.equal(url.searchParams.get('series'), '1.2.3:4:10:1');
      assert.equal(url.searchParams.get('compressionFormat'), 'zip');
      requests.push(resource);
      return new Response('Archive fixture');
    }
  });

  await runCommand(
    'series',
    seriesExportArgs,
    seriesExport,
    ['--zip', '-o', file],
    deps
  );

  assert.equal(requests.length, 1);
  assert.equal(await readFile(file, 'utf8'), 'Archive fixture');
});
