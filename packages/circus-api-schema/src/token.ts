import { z } from 'zod';
import { dateField } from './formats.ts';

/** An OAuth2 token in the database */
export const tokenDoc = z
  .strictObject({
    accessToken: z.string(),
    accessTokenExpiresAt: dateField(),
    clientId: z.string(),
    refreshToken: z.string(),
    refreshTokenExpiresAt: dateField(),
    userId: z.string(),
    permanentTokenId: z
      .string()
      .nullable()
      .describe('Set for a permanent token issued via the API.'),
    permanentTokenDescription: z.string().max(1024).nullable(),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe('Represents an OAuth2 token.');
