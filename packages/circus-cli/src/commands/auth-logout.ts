import { promises as fs } from 'node:fs';
import { styleText } from 'node:util';
import type { CommandAction } from './CommandAction.ts';

const action: CommandAction = ({ configPath, prompts }) => {
  return async () => {
    try {
      await fs.lstat(configPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      console.log('No saved connection to remove.');
      return;
    }
    if (
      !(await prompts.confirm({
        message: 'Are you sure you want to log out?',
        default: false
      }))
    )
      return;

    await fs.rm(configPath, { force: true });
    console.log(styleText('green', 'Config file deleted successfully'));
  };
};

export default action;
