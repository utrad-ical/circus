import inq from 'inquirer';
import { promises as fs } from 'node:fs';
import pc from 'picocolors';
import CommandAction from './CommandAction.js';
import fileExists from '../utils/fileExits.js';

const action: CommandAction = ({ rcFilePath }) => {
  return async () => {
    if (await fileExists(rcFilePath)) {
      console.log(pc.yellow(`The token file already exists at ${rcFilePath}.`));
      const ans = await inq.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Overwrite existing config file?',
          default: false
        }
      ]);
      if (!ans.overwrite) return;
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
        validate: (val: string) => {
          if (val.length === 0) return 'Token is required.';
          return true;
        }
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
