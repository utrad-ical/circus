import inq from 'inquirer';
import { promises as fs } from 'node:fs';
import pc from 'picocolors';
import fileExists from '../utils/fileExists.js';
import { confirm, defaultValidateString } from '../utils/inquiry.js';
import CommandAction from './CommandAction.js';

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
          console.log(pc.green('Config file deleted successfully'));
        }
      }
      return;
    }

    if (rcFileExists) {
      console.log(pc.yellow(`The token file already exists at ${rcFilePath}.`));
      if (!(await confirm('Overwrite existing config file?'))) return;
    }

    const ans = await inq.prompt([
      {
        type: 'input',
        name: 'endpoint',
        message: 'API endpoint:',
        validate: (val: string) => {
          if (!val.endsWith('/'))
            return 'Input correct API endpoint (must end with a slash).';
          return true;
        }
      },
      {
        type: 'input',
        name: 'token',
        message: 'API token:',
        validate: defaultValidateString
      }
    ]);

    await fs.writeFile(
      rcFilePath,
      `# CIRCUS API Client config file\n` +
        `# Generated at ${new Date().toISOString()}\n\n` +
        `CIRCUS_API_ENDPOINT=${ans.endpoint}\n` +
        `CIRCUS_API_TOKEN=${ans.token}\n`
    );
    console.log(pc.green(`Token saved to ${rcFilePath}.`));
  };
};

export default action;
