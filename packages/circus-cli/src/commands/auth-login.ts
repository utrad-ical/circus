import { input, password } from '@inquirer/prompts';
import { promises as fs } from 'node:fs';
import { styleText } from 'node:util';
import fileExists from '../utils/fileExists.ts';
import { confirm, defaultValidateString } from '../utils/inquiry.ts';
import type { CommandAction } from './CommandAction.ts';

const verifyApi = async (
  endpoint: URL,
  resource: 'status' | 'login-info',
  token?: string
): Promise<true | string> => {
  const url = new URL(resource, endpoint);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (response.status !== 200) {
      await response.body?.cancel();
      if (token && (response.status === 401 || response.status === 403)) {
        return `The API rejected this token (HTTP ${response.status}).`;
      }
      return `Request to ${url} returned HTTP ${response.status}.`;
    }

    const body: unknown = await response.json();
    if (body && typeof body === 'object') {
      if (
        resource === 'status' &&
        'status' in body &&
        body.status === 'running'
      ) {
        return true;
      }
      if (
        resource === 'login-info' &&
        'loginId' in body &&
        typeof body.loginId === 'string' &&
        'userEmail' in body &&
        typeof body.userEmail === 'string'
      ) {
        return true;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return `Request to ${url} timed out.`;
    }
    if (!(error instanceof SyntaxError)) return `Could not reach ${url}.`;
  }
  return `Unexpected response from ${url}.`;
};

const action: CommandAction = ({ rcFilePath }) => {
  return async () => {
    if (await fileExists(rcFilePath)) {
      console.log(
        styleText('yellow', `The token file already exists at ${rcFilePath}.`)
      );
      if (!(await confirm('Overwrite existing config file?'))) return;
    }

    const endpoint = new URL(
      await input({
        message: 'API endpoint:',
        validate: async value => {
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
            return 'Enter an HTTP or HTTPS API endpoint ending with a slash.';
          }
          return verifyApi(url, 'status');
        }
      })
    );
    console.log(styleText('green', `Connected to ${endpoint}`));
    const token = await password({
      message: 'API token:',
      mask: true,
      validate: async value => {
        const valid = defaultValidateString(value);
        if (valid !== true) return valid;
        return verifyApi(endpoint, 'login-info', value);
      }
    });

    await fs.writeFile(
      rcFilePath,
      `# CIRCUS API Client config file\n` +
        `# Generated at ${new Date().toISOString()}\n\n` +
        `CIRCUS_API_ENDPOINT=${endpoint}\n` +
        `CIRCUS_API_TOKEN=${token}\n`,
      { mode: 0o600 }
    );
    // `mode` applies only when the file is created
    await fs.chmod(rcFilePath, 0o600);
    console.log(styleText('green', `Token saved to ${rcFilePath}.`));
  };
};

export default action;
