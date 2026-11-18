import { z } from 'zod';
import { dateField } from './formats.ts';

/** A permanent token shown to its owner (without the token itself) */
export const permanentToken = z
  .strictObject({
    tokenId: z
      .string()
      .describe('Identifier for permanent token (not a token itself)'),
    description: z.string().describe('Free text to describe this token.'),
    createdAt: dateField(),
    updatedAt: dateField()
  })
  .describe('Permanent token exchanged via API.');
