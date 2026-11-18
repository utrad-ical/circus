import { randomBytes } from 'node:crypto';
import type { Models } from '../interface.ts';
const generateRandomToken = () => randomBytes(20).toString('hex');

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
    clientId: 'CIRCUS Front UI', // Retain the existing token record format
    userId: userEmail,
    permanentTokenId,
    permanentTokenDescription: description
  };
  await models.token.insert(data);
  return data;
};

export default generatePermanentToken;
