import generateUniqueId from '../utils/generateUniqueId';
import Command from './Command';

export const help = () => {
  return 'Generates and prints a new ID.';
};

export const command: Command<{}> = async () => {
  return async () => {
    console.log(generateUniqueId());
  };
};
