export type ColorDefinition = string | { color: string; alpha: number };

export const normalizeColor = (
  input: ColorDefinition
): { color: string; alpha: number } => {
  const errorMessage = 'Malformed color definition.';
  if (typeof input === 'object') {
    if (/^#[0-9a-f]{6}$/.test(input.color) && typeof input.alpha === 'number') {
      return input;
    } else throw new TypeError(errorMessage);
  }
  if (/^#[0-9a-f]{8}$/.test(input)) {
    return {
      color: '#' + input.slice(1, 7),
      alpha: parseInt(input.slice(7), 16) / 255
    };
  } else throw new TypeError(errorMessage);
};
