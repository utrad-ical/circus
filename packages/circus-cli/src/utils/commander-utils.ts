import { InvalidArgumentError } from 'commander';

export const int = (opts: { min?: number; max?: number } = {}) => {
  return (value: string) => {
    if (!/^\-?[1-9][0-9]*$/.test(value))
      throw new InvalidArgumentError(`Not a valid integer.`);
    const i = parseInt(value, 10);
    if (isNaN(i)) throw new InvalidArgumentError(`Not a valid integer.`);
    if (typeof opts.min === 'number' && i < opts.min)
      throw new InvalidArgumentError(`Must not be smaller than ${opts.min}.`);
    if (typeof opts.max === 'number' && i > opts.max)
      throw new InvalidArgumentError(`Must not be greater than ${opts.max}.`);
    return i;
  };
};
