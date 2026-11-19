import { promises as fs, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, posix, win32 } from 'node:path';
import { z } from 'zod';
import { defaultValidateString } from './inquiry.ts';

export const apiEndpoint = z.string().transform((value, ctx) => {
  const url = URL.parse(value);
  if (
    !url ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    !url.href.endsWith('/') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'Enter an HTTP or HTTPS API endpoint ending with a slash.'
    });
    return z.NEVER;
  }
  return url.href;
});

const connection = z.strictObject({
  endpoint: apiEndpoint,
  token: z.string().refine(value => defaultValidateString(value) === true)
});

const config = z.strictObject({
  formatVersion: z.literal(1),
  profiles: z.tuple([connection.extend({ name: z.literal('default') })])
});

type Connection = z.output<typeof connection>;

export const getConfigPath = (
  home = homedir(),
  env = process.env,
  platform = process.platform
) => {
  const path = platform === 'win32' ? win32 : posix;
  const { XDG_CONFIG_HOME, APPDATA } = env;
  if (XDG_CONFIG_HOME && path.isAbsolute(XDG_CONFIG_HOME)) {
    return path.join(XDG_CONFIG_HOME, 'circus-cli', 'config.json');
  }
  const base =
    platform === 'win32'
      ? APPDATA && path.isAbsolute(APPDATA)
        ? APPDATA
        : path.join(home, 'AppData', 'Roaming')
      : path.join(home, '.config');
  return path.join(base, 'circus-cli', 'config.json');
};

export const loadCliConnection = (
  configPath: string,
  env = process.env
): Connection | undefined => {
  const { CIRCUS_API_ENDPOINT: endpoint, CIRCUS_API_TOKEN: token } = env;
  if (endpoint !== undefined || token !== undefined) {
    if (!endpoint || !token) {
      throw new Error(
        'Set both CIRCUS_API_ENDPOINT and CIRCUS_API_TOKEN, or unset both to use the saved connection.'
      );
    }
    const parsed = connection.safeParse({ endpoint, token });
    if (!parsed.success) {
      throw new Error(
        'Check CIRCUS_API_ENDPOINT (an HTTP or HTTPS URL ending with a slash) and CIRCUS_API_TOKEN.'
      );
    }
    return parsed.data;
  }

  const loginHint = 'Run "circus-cli auth login" to save a connection.';
  let contents: string;
  try {
    contents = readFileSync(configPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new Error(`Could not read the configuration file at ${configPath}.`);
  }
  let data: unknown;
  try {
    data = JSON.parse(contents);
  } catch {
    throw new Error(
      `Invalid JSON in the configuration file at ${configPath}. ${loginHint}`
    );
  }
  if (
    data &&
    typeof data === 'object' &&
    'formatVersion' in data &&
    typeof data.formatVersion === 'number' &&
    data.formatVersion !== 1
  ) {
    throw new Error(
      `Unsupported configuration format version at ${configPath}. This version of circus-cli supports formatVersion 1.`
    );
  }
  const parsed = config.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid connection settings in ${configPath}. ${loginHint}`
    );
  }
  const [profile] = parsed.data.profiles;
  return { endpoint: profile.endpoint, token: profile.token };
};

export const saveCliConnection = async (
  configPath: string,
  { endpoint, token }: Connection
) => {
  const data: z.input<typeof config> = {
    formatVersion: 1,
    profiles: [{ name: 'default', endpoint, token }]
  };
  const directory = dirname(configPath);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryDirectory = await fs.mkdtemp(join(directory, '.config-'));
  try {
    const temporaryPath = join(temporaryDirectory, 'config.json');
    await fs.writeFile(temporaryPath, JSON.stringify(data, null, 2) + '\n', {
      mode: 0o600
    });
    await fs.rename(temporaryPath, configPath);
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
};
