import { confirm as confirmPrompt, input } from '@inquirer/prompts';

export const confirm = (message: string) =>
  confirmPrompt({ message, default: false });

export const defaultValidateString = (val: string) => {
  if (val.length === 0) return 'This value is required.';
  // oxlint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(val))
    return 'The value contains invalid characters.';
  return true;
};

export const promptString = (
  message: string,
  validate: (val: string) => true | string = defaultValidateString
) => input({ message, validate });
