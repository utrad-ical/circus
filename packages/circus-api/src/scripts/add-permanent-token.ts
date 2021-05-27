import { Models } from '../interface';
import generatePermanentToken from '../utils/generatePermanentToken';
import Command from './Command';

export const help = () => {
  return (
    'Grants permanent access token for the given user.\n' +
    'Usage: node circus.js add-permanent-token [userEmailOrName]'
  );
};

export const options = () => {
  return [
    { names: ['description', 'd'], help: 'Description.', type: 'string' }
  ];
};

export const command: Command<{ models: Models }> = async (
  opts,
  { models }
) => {
  return async (options: any) => {
    const [userEmailOrName] = options._args;
    const description =
      options.description ?? 'A permanent token for API access';

    if (!userEmailOrName) {
      console.log(help());
      return;
    }
    const users = await models.user.findAll({
      $or: [{ userEmail: userEmailOrName }, { loginId: userEmailOrName }]
    });
    if (!users.length) throw new Error('The specified user was not found');
    const user = users[0];

    const result = await generatePermanentToken(
      models,
      user.userEmail,
      description
    );
    console.log('Your permanent access token is: ' + result.accessToken);
  };
};

command.dependencies = ['models'];
