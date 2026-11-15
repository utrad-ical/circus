import { promises as fs, createReadStream } from 'node:fs';
import * as path from 'node:path';
import { pipeline, Readable } from 'node:stream';
import { styleText } from 'node:util';
import zlib from 'node:zlib';
import { select } from '@inquirer/prompts';
import { createTarPacker } from 'modern-tar';
import type { AuthorizedFetch } from '../utils/createAuthorizedFetch.ts';
import createSpinner from '../utils/createSpinner.ts';
import multipartBody, { type MultipartFile } from '../utils/multipartBody.ts';
import watchProgress from '../utils/watchProgress.ts';
import type { CommandAction } from './CommandAction.ts';

interface LocalFile {
  /** Path on this machine */
  file: string;
  /** Name sent to the server, relative to the argument */
  name: string;
  size: number;
  isArchive: boolean;
}

interface ImportSummary {
  imported: number;
  skipped: { file: string; reason: string }[];
  errors: { file: string; reason: string }[];
}

// The name of the tar.gz made from loose files, hidden from the output
const packedName = 'circus-cli-upload.tar.gz';

const isArchive = async (file: string) => {
  const handle = await fs.open(file);
  try {
    const head = new Uint8Array(4);
    await handle.read(head, 0, 4, 0);
    const isZip =
      head[0] === 0x50 &&
      head[1] === 0x4b &&
      head[2] === 0x03 &&
      head[3] === 0x04;
    const isGzip = head[0] === 0x1f && head[1] === 0x8b;
    return isZip || isGzip;
  } finally {
    await handle.close();
  }
};

const collectFiles = async (
  file: string,
  name: string,
  result: LocalFile[]
) => {
  const stat = await fs.stat(file);
  if (stat.isDirectory()) {
    for (const entry of (await fs.readdir(file)).sort()) {
      await collectFiles(path.join(file, entry), `${name}/${entry}`, result);
    }
  } else if (stat.isFile()) {
    result.push({
      file,
      name,
      size: stat.size,
      isArchive: await isArchive(file)
    });
  }
};

/**
 * Packs the files into a tar.gz while reading it.
 */
const packFiles = (files: LocalFile[]): AsyncIterable<Uint8Array> => {
  const { readable, controller } = createTarPacker();
  (async () => {
    for (const { file, name, size } of files) {
      const entry = controller.add({ name, size, type: 'file', mode: 0o644 });
      await (Readable.toWeb(createReadStream(file)) as ReadableStream).pipeTo(
        entry
      );
    }
    controller.finalize();
  })().catch(err => controller.error(err));
  // zlib waits for the reader, unlike CompressionStream of Node
  return pipeline(
    Readable.fromWeb(readable as any),
    zlib.createGzip(),
    () => {}
  );
};

const toParts = (files: LocalFile[]): MultipartFile[] => {
  const loose = files.filter(f => !f.isArchive);
  return [
    ...(loose.length
      ? [{ filename: packedName, data: () => packFiles(loose) }]
      : []),
    ...files
      .filter(f => f.isArchive)
      .map(f => ({ filename: f.name, data: () => createReadStream(f.file) }))
  ];
};

const unpack = (name: string) => name.replaceAll(`${packedName}/`, '');

const formatBytes = (bytes: number) =>
  bytes >= 1 << 30
    ? `${(bytes / (1 << 30)).toFixed(2)} GiB`
    : `${(bytes / (1 << 20)).toFixed(1)} MiB`;

/**
 * Lets the user choose one of the accessible domains.
 */
const chooseDomain = async (fetch: AuthorizedFetch) => {
  const res = await fetch('login-info/full');
  const { domains = [], defaultDomain } = (await res.json()) as {
    domains?: string[];
    defaultDomain?: string;
  };
  if (!domains.length) throw new Error('You cannot access any domain.');
  if (domains.length === 1) {
    console.log(`Domain: ${domains[0]}`);
    return domains[0];
  }
  if (!process.stdin.isTTY)
    throw new Error('Specify the domain with "-d (--domain)".');
  return await select({
    message: 'Domain:',
    choices: domains.map(value => ({ value })),
    default: domains.includes(defaultDomain!) ? defaultDomain : undefined
  });
};

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], options) => {
    const fetch = getFetch();
    const { batchSize } = options;
    const domain: string = options.domain ?? (await chooseDomain(fetch));

    const files: LocalFile[] = [];
    for (const arg of args) {
      await collectFiles(arg, path.basename(path.resolve(arg)), files);
    }
    if (!files.length) throw new Error('No files to upload.');
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    console.log(
      `Uploading ${files.length} file(s) (${formatBytes(totalBytes)})...`
    );

    const size = batchSize ?? files.length;
    const batches = Math.ceil(files.length / size);
    if (batches > 1) console.log(`Split into ${batches} batches.`);

    const total: ImportSummary = { imported: 0, skipped: [], errors: [] };
    for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
      if (batches > 1) {
        console.log(
          styleText('cyan', `\nBatch #${batchIdx + 1} of ${batches}`)
        );
      }
      const batch = files.slice(batchIdx * size, (batchIdx + 1) * size);
      const spinner = createSpinner('Uploading...', { paneLines: 5 });
      let sent = 0;
      let message = '';
      const updateSpinner = () =>
        spinner.update(
          `Sent: ${formatBytes(sent)}` + (message ? ` | ${message}` : '')
        );
      const watcher = await watchProgress(fetch, event => {
        if (event.type === 'log') {
          for (const { level, message } of event.lines)
            spinner.log(unpack(message), level);
        } else {
          message = event.message;
          updateSpinner();
        }
      });
      const { body, contentType } = multipartBody(toParts(batch), {
        onSent: bytes => {
          sent += bytes;
          updateSpinner();
        }
      });
      const params = watcher.progressId
        ? `?progressId=${encodeURIComponent(watcher.progressId)}`
        : '';
      let summary: ImportSummary;
      try {
        const res = await fetch(
          `series/domain/${encodeURIComponent(domain)}${params}`,
          {
            method: 'POST',
            headers: { 'Content-Type': contentType },
            body,
            duplex: 'half'
          } as RequestInit
        );
        summary = (await res.json()) as ImportSummary;
      } catch (err: any) {
        // 400 (no DICOM files) and 422 (some failed) have the summary
        const parsed =
          err.status === 400 || err.status === 422
            ? (() => {
                try {
                  return JSON.parse(err.body);
                } catch {
                  return undefined;
                }
              })()
            : undefined;
        if (typeof parsed?.imported !== 'number') {
          spinner.stop('Upload failed.', true);
          throw err;
        }
        summary = parsed;
      } finally {
        // The last log lines may arrive after the response
        await watcher.wait(3000);
        watcher.stop();
      }
      const { imported, skipped, errors } = summary;
      spinner.stop(
        `Imported ${imported} file(s)` +
          (skipped.length ? `, skipped ${skipped.length}` : '') +
          (errors.length ? `, failed ${errors.length}` : '') +
          '.',
        errors.length > 0
      );
      total.imported += imported;
      total.skipped.push(...skipped);
      total.errors.push(...errors);
    }

    if (batches > 1) {
      console.log(
        `\nTotal: imported ${total.imported} file(s)` +
          (total.skipped.length ? `, skipped ${total.skipped.length}` : '') +
          (total.errors.length ? `, failed ${total.errors.length}` : '') +
          '.'
      );
    }
    if (total.skipped.length) {
      console.log(styleText('yellow', '\nSkipped:'));
      for (const { file, reason } of total.skipped)
        console.log(`  ${unpack(file)}: ${reason}`);
    }
    if (total.errors.length) {
      console.log(styleText('red', '\nFailed:'));
      for (const { file, reason } of total.errors)
        console.log(`  ${unpack(file)}: ${reason}`);
    }
    if (total.errors.length || !total.imported) process.exitCode = 1;
  };
};

export default action;
