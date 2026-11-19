import { promises as fs } from 'node:fs';
import { styleText } from 'node:util';
import fileExists from '../utils/fileExists.ts';
import { confirm } from '../utils/inquiry.ts';
import type { CommandAction } from './CommandAction.ts';

const action: CommandAction = ({ rcFilePath }) => {
  return async () => {
    if (!(await fileExists(rcFilePath))) {
      throw new Error('No config file found');
    }
    if (!(await confirm('Are you sure you want to log out?'))) return;

    await fs.unlink(rcFilePath);
    console.log(styleText('green', 'Config file deleted successfully'));
  };
};

export default action;
