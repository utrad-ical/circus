import generateUniqueId from '../utils/generateUniqueId.ts';
import type Command from './Command.ts';

export const help = () => {
  return 'Generates and prints a new ID.';
};

export const command: Command<{}> = async () => {
  return async () => {
    console.log(generateUniqueId());
  };
};
