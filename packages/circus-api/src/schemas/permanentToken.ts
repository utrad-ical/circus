import { z } from 'zod';

export const permanentToken = z
  .strictObject({
    tokenId: z
      .string()
      .optional()
      .describe('Identifier for permanent token (not a token itself)'),
    description: z
      .string()
      .optional()
      .describe('Free text to describe this token.')
  })
  .describe('Permanent token exchanged via API.');
