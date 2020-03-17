import { createHash } from 'crypto';
import { Models } from '../interface';
import { OAuthClientId } from '../middleware/auth/createOauthServer';
import Command from './Command';

export const help = () => {
  return (
    'Grants permanent access token for the given user.\n' +
    'Usage: node circus.js add-permanent-token [userEmailOrName]'
  );
};

const generateRandomToken = () => {
  // The same format node-oauth2-server gives
  const bytes = new Uint8Array(256);
  for (let i = 0; i <= bytes.length; i++)
    bytes[i] = Math.floor(Math.random() * 256);
  const sha1 = createHash('sha1');
  sha1.update(bytes);
  return sha1.digest('hex');
};

export const command: Command<{ models: Models }> = async (
  opts,
  { models }
) => {
  return async (options: any) => {
    const [userEmailOrName] = options._args;
    if (!userEmailOrName) {
      console.log(help());
      return;
    }
    const users = await models.user.findAll({
      $or: [{ userEmail: userEmailOrName }, { loginId: userEmailOrName }]
    });
    if (!users.length) throw new Error('The specified user was not found');
    const user = users[0];

    const accessToken = generateRandomToken();
    const refreshToken = generateRandomToken(); // dummy
    const permanentTokenId = generateRandomToken();
    const expiresAt = new Date('2100-12-31T00:00:00');
    await models.token.insert({
      accessToken,
      accessTokenExpiresAt: expiresAt,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
      clientId: OAuthClientId,
      userId: user.userEmail,
      permanentTokenId,
      permanentTokenDescription: 'A permanent token for API access'
    });
    console.log('Your permanent access token is: ' + accessToken);
  };
};

command.dependencies = ['models'];
