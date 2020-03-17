import { Models } from '../interface';
import Command from './Command';

export const options = () => {
  return [
    {
      names: ['all', 'a'],
      help: 'Also deletes permanent tokens.',
      type: 'bool'
    }
  ];
};

export const help = () => {
  return 'Removes all access tokens.\n' + 'Usage: node circus.js clear-token';
};

export const command: Command<{ models: Models }> = async (opt, { models }) => {
  return async (options: any) => {
    const { all } = options;
    const where = all ? {} : { permanentTokenId: null };
    const res = await models.token.deleteMany(where);
    console.log(`Deleted ${res.result.n} access token(s).`);
    if (!all) {
      console.log('Use --all flag to also delete permanent tokens.');
    }
  };
};

command.dependencies = ['models'];
