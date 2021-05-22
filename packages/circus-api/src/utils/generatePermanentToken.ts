import { createHash } from 'crypto';
import { Models } from '../interface';
import { OAuthClientId } from '../middleware/auth/createOauthServer';

const generateRandomToken = () => {
  // The same format node-oauth2-server gives
  const bytes = new Uint8Array(256);
  for (let i = 0; i <= bytes.length; i++)
    bytes[i] = Math.floor(Math.random() * 256);
  const sha1 = createHash('sha1');
  sha1.update(bytes);
  return sha1.digest('hex');
};

const generatePermanentToken = async (
  models: Models,
  userEmail: string, // This user must exist
  description: string
) => {
  const accessToken = generateRandomToken();
  const refreshToken = generateRandomToken(); // dummy
  const permanentTokenId = generateRandomToken();
  const expiresAt = new Date('2100-12-31T00:00:00');
  const data = {
    accessToken,
    accessTokenExpiresAt: expiresAt,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
    clientId: OAuthClientId,
    userId: userEmail,
    permanentTokenId,
    permanentTokenDescription: description
  };
  await models.token.insert(data);
  return data;
};

export default generatePermanentToken;
