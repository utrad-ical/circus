import { input } from '@inquirer/prompts';
import { promises as fs } from 'node:fs';
import { styleText } from 'node:util';
import fileExists from '../utils/fileExists.ts';
import { confirm, defaultValidateString } from '../utils/inquiry.ts';
import type { CommandAction } from './CommandAction.ts';

interface Options {
  logout?: boolean;
}

const action: CommandAction = ({ rcFilePath }) => {
  return async (options: Options) => {
    const rcFileExists = await fileExists(rcFilePath);
    const { logout } = options;

    if (logout) {
      if (!rcFileExists) {
        throw new Error('No config file found');
      } else {
        if (await confirm('Are you sure you want to log out?')) {
          await fs.unlink(rcFilePath);
          console.log(styleText('green', 'Config file deleted successfully'));
        }
      }
      return;
    }

    if (rcFileExists) {
      console.log(
        styleText('yellow', `The token file already exists at ${rcFilePath}.`)
      );
      if (!(await confirm('Overwrite existing config file?'))) return;
    }

    const endpoint = await input({
      message: 'API endpoint:',
      validate: val => {
        if (!val.endsWith('/'))
          return 'Input correct API endpoint (must end with a slash).';
        return true;
      }
    });
    const token = await input({
      message: 'API token:',
      validate: defaultValidateString
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
