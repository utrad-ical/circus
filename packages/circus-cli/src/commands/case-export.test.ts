import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { Command } from 'commander';
import caseExportArgs from './case-export.args.ts';
import caseExport from './case-export.ts';

const setup = async (
  t: TestContext,
  download: (ids: string) => Response | Promise<Response>
) => {
  const outDir = await fs.mkdtemp(join(tmpdir(), 'circus-case-export-test-'));
  const exitCode = process.exitCode;
  process.exitCode = undefined;
  t.after(async () => {
    process.exitCode = exitCode;
    await fs.rm(outDir, { recursive: true, force: true });
  });
  const log = t.mock.method(console, 'log', () => {});
  const errors = t.mock.method(console, 'error', () => {});
  const requests: string[] = [];
  const program = new Command();
  caseExportArgs(program).action(
    caseExport({
      rcFilePath: '',
      getFetch: () => async resource => {
        if (resource === 'progress') throw new Error('Progress unavailable');
        const url = new URL(resource, 'https://example.test/');
        assert.equal(url.pathname, '/cases/export-mhd');
        const ids = url.searchParams.get('caseIds');
        assert.ok(ids);
        requests.push(ids);
        return download(ids);
      }
    })
  );
  const run = (...args: string[]) =>
    program.parseAsync(['case-export', '-o', outDir, ...args], {
      from: 'user'
    });
  return { outDir, log, errors, requests, run };
};

async function* interruptedDownload() {
  yield new TextEncoder().encode('partial response');
  throw new Error('Connection lost');
}

test('skips a failed case and continues with one case per request', async t => {
  const { outDir, log, errors, requests, run } = await setup(t, ids => {
    if (ids === 'B') throw new Error('Case is unavailable');
    return new Response(ids);
  });

  await run('--skip-on-error', '--batch-size', '10', 'A', 'B', 'C');

  assert.deepEqual(requests, ['A', 'B', 'C']);
  assert.deepEqual((await fs.readdir(outDir)).sort(), [
    'batch-001.tgz',
    'batch-003.tgz'
  ]);
  assert.equal(await fs.readFile(join(outDir, 'batch-001.tgz'), 'utf8'), 'A');
  assert.equal(await fs.readFile(join(outDir, 'batch-003.tgz'), 'utf8'), 'C');
  assert.equal(
    errors.mock.calls[0].arguments[0],
    'Failed to export case B: Case is unavailable'
  );
  assert.equal(
    log.mock.calls.at(-1)?.arguments[0],
    'Exported 2 case(s), 1 failed.'
  );
  assert.equal(process.exitCode, 1);
});

test('continues after cleaning up an interrupted download', async t => {
  const { outDir, errors, requests, run } = await setup(t, ids =>
    ids === 'A'
      ? new Response(ReadableStream.from(interruptedDownload()))
      : new Response(ids)
  );
  await run('--skip-on-error', '--zip', 'A', 'B');

  assert.deepEqual(requests, ['A', 'B']);
  assert.deepEqual(await fs.readdir(outDir), ['batch-002.zip']);
  assert.equal(await fs.readFile(join(outDir, 'batch-002.zip'), 'utf8'), 'B');
  assert.equal(
    errors.mock.calls[0].arguments[0],
    'Failed to export case A: Connection lost'
  );
  assert.equal(process.exitCode, 1);
});

test('reads IDs from a file and stops at the first failed batch by default', async t => {
  const { outDir, requests, run } = await setup(t, ids =>
    ids === 'C,D'
      ? new Response(ReadableStream.from(interruptedDownload()))
      : new Response(ids)
  );
  const list = join(outDir, 'cases.txt');
  await fs.writeFile(list, 'A\nB\nB\nC\nD\nE\n');

  await assert.rejects(
    run('--batch-size', '2', '--file', list),
    /Connection lost/
  );

  assert.deepEqual(requests, ['A,B', 'C,D']);
  assert.deepEqual((await fs.readdir(outDir)).sort(), [
    'batch-001.tgz',
    'cases.txt'
  ]);
});

test('rejects an output directory with a previous batch before making requests', async t => {
  const { outDir, requests, run } = await setup(t, ids => new Response(ids));
  const existing = join(outDir, 'batch-099.zip');
  await fs.writeFile(existing, 'existing archive');

  await assert.rejects(
    run('A'),
    /Output archive already exists: .*batch-099\.zip/
  );

  assert.deepEqual(requests, []);
  assert.deepEqual(await fs.readdir(outDir), ['batch-099.zip']);
  assert.equal(await fs.readFile(existing, 'utf8'), 'existing archive');
});

test('stops without overwriting an archive created after the preflight check', async t => {
  const { outDir, requests, run } = await setup(t, async ids => {
    if (ids === 'B') {
      await fs.writeFile(join(outDir, 'batch-002.tgz'), 'existing archive');
    }
    return new Response(ids);
  });

  await assert.rejects(
    run('--skip-on-error', 'A', 'B', 'C'),
    /Output archive already exists: .*batch-002\.tgz/
  );

  assert.deepEqual(requests, ['A', 'B']);
  assert.deepEqual((await fs.readdir(outDir)).sort(), [
    'batch-001.tgz',
    'batch-002.tgz'
  ]);
  assert.equal(await fs.readFile(join(outDir, 'batch-001.tgz'), 'utf8'), 'A');
  assert.equal(
    await fs.readFile(join(outDir, 'batch-002.tgz'), 'utf8'),
    'existing archive'
  );
});

test('warns about a cleanup failure and continues exporting', async t => {
  const { outDir, log, requests, run } = await setup(
    t,
    ids => new Response(ids)
  );
  const warnings = t.mock.method(console, 'warn', () => {});
  const remove = fs.rm;
  let remainingDirectory: string | undefined;
  t.mock.method(fs, 'rm', async (...args: Parameters<typeof fs.rm>) => {
    const [target] = args;
    if (
      typeof target === 'string' &&
      target.startsWith(join(outDir, '.case-export-')) &&
      !remainingDirectory
    ) {
      remainingDirectory = target;
      throw new Error('Resource busy');
    }
    await remove(...args);
  });

  await run('--skip-on-error', 'A', 'B');

  assert.deepEqual(requests, ['A', 'B']);
  assert.ok(remainingDirectory);
  assert.equal(
    warnings.mock.calls[0].arguments[0],
    `Warning: could not remove temporary directory ${remainingDirectory}: Resource busy`
  );
  assert.equal(await fs.readFile(join(outDir, 'batch-001.tgz'), 'utf8'), 'A');
  assert.equal(await fs.readFile(join(outDir, 'batch-002.tgz'), 'utf8'), 'B');
  assert.equal(
    log.mock.calls.at(-1)?.arguments[0],
    'Exported 2 case(s), 0 failed.'
  );
  assert.equal(process.exitCode, undefined);
});
