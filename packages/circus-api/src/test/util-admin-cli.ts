import assert from 'node:assert/strict';
import { runCli, tempDirectory } from '@utrad-ical/circus-lib/test/cli';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

const entry = new URL('../../circus.ts', import.meta.url);

export const runAdminCli = async (args: readonly string[], configPath = '') => {
  const { code, stdout, stderr } = await runCli(entry, args, {
    env: { ...process.env, CIRCUS_CONFIG: configPath }
  });
  return {
    code,
    stdout: stripVTControlCharacters(stdout),
    stderr: stripVTControlCharacters(stderr)
  };
};

export const writeAdminCliConfig = async (t: TestContext, source: string) => {
  const dir = await tempDirectory(t, 'circus-admin-cli-');
  const configPath = join(dir, 'circus.config.mjs');
  await writeFile(configPath, source);
  return configPath;
};

export const adminCliMongoConfig = (t: TestContext) => {
  assert.ok(process.env.CIRCUS_MONGO_TEST_URL);
  return writeAdminCliConfig(
    t,
    'export default { database: { options: { mongoUrl: process.env.CIRCUS_MONGO_TEST_URL } } };\n'
  );
};
