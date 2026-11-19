export const defaultValidateString = (val: string) => {
  if (val.length === 0) return 'This value is required.';
  // oxlint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(val))
    return 'The value contains invalid characters.';
  return true;
};
