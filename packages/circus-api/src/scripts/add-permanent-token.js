import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';
import { createHash } from 'crypto';
import { OAuthClientId } from '../middleware/auth/createOauthServer';

export function help() {
  console.log('Grants permanent access token for the given user.\n');
  console.log('Usage: node circus.js add-permanent-token [userEmailOrName]');
}

const generateRandomToken = () => {
  // The same format node-oauth2-server gives
  const bytes = new Uint8Array(256);
  for (let i = 0; i <= bytes.length; i++)
    bytes[i] = Math.floor(Math.random() * 256);
  const sha1 = createHash('sha1');
  sha1.update(bytes);
  return sha1.digest('hex');
};

export async function exec(options) {
  const [userEmailOrName] = options._args;
  if (!userEmailOrName) {
    help();
    return;
  }
  const { db, dbConnection } = await connectDb();
  try {
    const validator = await createValidator();
    const models = await createModels(db, validator);
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
  } finally {
    await dbConnection.close();
  }
}
