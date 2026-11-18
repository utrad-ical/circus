import merge from 'merge';
import { existsSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const containerMode = process.env.CIRCUS_CONTAINER_MODE;
export const isContainerMode =
  containerMode === '1' || (containerMode !== '0' && existsSync('/.dockerenv'));

export class ConfigLoadError extends Error {}

// Both the source and built loader sit four levels below the workspace root.
const workspaceRoot = resolve(import.meta.dirname, '../../../..');
const workspaceConfigDirectory = existsSync(
  resolve(workspaceRoot, 'pnpm-workspace.yaml')
)
  ? workspaceRoot
  : undefined;
const configFileNames = [
  'circus.config.js',
  'circus.config.mjs',
  'circus.config.cjs',
  'circus.config.mts'
];

const configFileExists = (filePath: string) => {
  try {
    return lstatSync(filePath, { throwIfNoEntry: false }) !== undefined;
  } catch (cause) {
    throw new ConfigLoadError(
      `Could not inspect configuration file ${filePath}`,
      { cause }
    );
  }
};

const readConfig = async (filePath: string) => {
  let config: unknown;
  try {
    config = (await import(pathToFileURL(filePath).href)).default;
  } catch (cause) {
    const code = (cause as { code?: unknown } | null | undefined)?.code;
    let reason = 'module load failed';
    let location = filePath;
    if (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') {
      reason = existsSync(filePath)
        ? 'a dependency was not found'
        : 'file not found';
    } else if (cause instanceof SyntaxError) {
      reason = 'invalid syntax';
      const firstLine = cause.stack?.split('\n', 1)[0];
      if (
        firstLine?.startsWith(`${filePath}:`) &&
        /^:\d+(?::\d+)?$/.test(firstLine.slice(filePath.length))
      ) {
        location = firstLine;
      }
    } else if (
      typeof code === 'string' &&
      /^[A-Z][A-Z0-9_]{0,39}$/.test(code)
    ) {
      reason = code;
    }
    throw new ConfigLoadError(
      `Could not load configuration file ${location} (${reason})`,
      { cause }
    );
  }
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new ConfigLoadError(
      `Configuration file ${filePath} must export an object`
    );
  }
  return config;
};

const loadConfig = async (
  defaultModules: string[],
  configDirectory = workspaceConfigDirectory
) => {
  const configuredPath = process.env.CIRCUS_CONFIG;
  if (configuredPath === '') {
    throw new ConfigLoadError(
      'CIRCUS_CONFIG must specify a configuration file'
    );
  }
  const configPath =
    configuredPath !== undefined
      ? resolve(configuredPath)
      : configDirectory &&
        configFileNames
          .map(name => resolve(configDirectory, name))
          .find(configFileExists);
  const custom = configPath ? await readConfig(configPath) : {};
  const defaults = await Promise.all(
    defaultModules.map(
      async filePath => (await import(pathToFileURL(filePath).href)).default
    )
  );
  return merge.recursive(true, ...defaults, custom);
};

export default loadConfig;
