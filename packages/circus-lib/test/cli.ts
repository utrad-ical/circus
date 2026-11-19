import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { finished } from 'node:stream/promises';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

interface RunCliOptions {
  env?: NodeJS.ProcessEnv;
  stdin?: string;
  timeout?: number;
}

export const runCli = async (
  entry: URL,
  args: readonly string[],
  { env, stdin, timeout = 5000 }: RunCliOptions = {}
) => {
  const child = spawn(process.execPath, [fileURLToPath(entry), ...args], {
    env,
    timeout
  });
  const closed = once(child, 'close');
  const input = finished(child.stdin, { cleanup: true });
  child.stdin.end(stdin);

  const [stdout, stderr, [code, signal]] = await Promise.all([
    text(child.stdout),
    text(child.stderr),
    closed as Promise<[number | null, NodeJS.Signals | null]>,
    input
  ]);
  if (code === null) throw new Error(`CLI stopped with signal ${signal}.`);
  return { code, stdout, stderr };
};

export const tempDirectory = async (
  t: TestContext,
  prefix = 'circus-cli-test-'
) => {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
};
