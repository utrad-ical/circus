import { styleText } from 'node:util';
import { z } from 'zod';
import { apiEndpoint, saveCliConnection } from '../utils/cliConfig.ts';
import { fetchAuthInfo } from '../utils/fetchAuthInfo.ts';
import fileExists from '../utils/fileExists.ts';
import { defaultValidateString } from '../utils/inquiry.ts';
import type { CommandAction } from './CommandAction.ts';

const status = z.object({ status: z.literal('running') });
const loginInfo = z.object({ loginId: z.string(), userEmail: z.string() });

const action: CommandAction = ({ configPath, prompts }) => {
  return async () => {
    if (await fileExists(configPath)) {
      console.log(
        styleText('yellow', `The config file already exists at ${configPath}.`)
      );
      if (
        !(await prompts.confirm({
          message: 'Overwrite existing config file?',
          default: false
        }))
      )
        return;
    }

    const input = await prompts.input({
      message: 'API endpoint:',
      validate: async value => {
        const parsed = apiEndpoint.safeParse(value);
        if (!parsed.success) return parsed.error.issues[0]!.message;
        try {
          await fetchAuthInfo(parsed.data, 'status', status);
          return true;
        } catch (error) {
          if (error instanceof Error) return error.message;
          throw error;
        }
      }
    });
    const endpoint = apiEndpoint.parse(input);
    console.log(styleText('green', `Connected to ${endpoint}`));
    const token = await prompts.password({
      message: 'API token:',
      mask: true,
      validate: async value => {
        const valid = defaultValidateString(value);
        if (valid !== true) return valid;
        try {
          await fetchAuthInfo(endpoint, 'login-info', loginInfo, value);
          return true;
        } catch (error) {
          if (error instanceof Error) return error.message;
          throw error;
        }
      }
    });

    await saveCliConnection(configPath, { endpoint, token });
    console.log(styleText('green', `Token saved to ${configPath}.`));
  };
};

export default action;
