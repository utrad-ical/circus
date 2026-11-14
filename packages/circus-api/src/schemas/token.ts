import { z } from 'zod';
import { dateField } from './formats.ts';

export const token = z
  .strictObject({
    accessToken: z.string().optional(),
    accessTokenExpiresAt: dateField().optional(),
    clientId: z.string().optional(),
    refreshToken: z.string().optional(),
    refreshTokenExpiresAt: dateField().optional(),
    userId: z.string().optional(),
    permanentTokenId: z.string().nullable().optional(),
    permanentTokenDescription: z.string().max(1024).nullable().optional()
  })
  .describe('Represents an OAuth2 token.');
