import inq from 'inquirer';

export const confirm = async (message: string) => {
  const ans = await inq.prompt([
    {
      type: 'confirm',
      name: 'value',
      message,
      default: false
    }
  ]);
  return ans.value;
};

export const defaultValidateString = (val: string) => {
  if (val.length === 0) return 'This value is required.';
  if (/[\x00-\x1f\x7f]/.test(val))
    return 'The value contains invalid characters.';
  return true;
};

export const promptString = async (
  message: string,
  validate: (val: string) => true | string = defaultValidateString
) => {
  const ans = await inq.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      validate
    }
  ]);
  return ans.value;
};
